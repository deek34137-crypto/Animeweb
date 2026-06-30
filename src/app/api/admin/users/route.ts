import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { requirePermission, Permission } from '@/lib/admin/middleware';
import { UserRole, AuditAction, AuditTargetType } from '@prisma/client';
import { invalidateAdminStatsCache } from '../stats/route';


export async function GET(request: NextRequest) {
  try {
    // 1. Authorize - Requires MANAGE_USERS permission
    const authResult = await requirePermission(Permission.MANAGE_USERS);
    if (!authResult.authorized) {
      return NextResponse.json({ error: authResult.error }, { status: authResult.status });
    }

    const { searchParams } = new URL(request.url);
    const query = searchParams.get('q') || '';
    const role = searchParams.get('role') || undefined;
    const page = parseInt(searchParams.get('page') || '1', 10);
    const limit = parseInt(searchParams.get('limit') || '20', 10);

    const whereClause: any = {};

    if (query) {
      whereClause.OR = [
        { username: { contains: query, mode: 'insensitive' } },
        { email: { contains: query, mode: 'insensitive' } },
        { displayName: { contains: query, mode: 'insensitive' } },
      ];
    }

    if (role && Object.values(UserRole).includes(role as any)) {
      whereClause.role = role as UserRole;
    }

    const [users, count] = await Promise.all([
      db.user.findMany({
        where: whereClause,
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      db.user.count({ where: whereClause }),
    ]);

    return NextResponse.json({
      users,
      pagination: {
        page,
        limit,
        total: count,
      },
    });
  } catch (error: any) {
    console.error('Admin Users GET API Error:', error);
    return NextResponse.json(
      { error: 'Internal Server Error', details: error.message },
      { status: 500 }
    );
  }
}

export async function PATCH(request: NextRequest) {
  try {
    // 1. Authorize - Requires MANAGE_USERS permission
    const authResult = await requirePermission(Permission.MANAGE_USERS);
    if (!authResult.authorized) {
      return NextResponse.json({ error: authResult.error }, { status: authResult.status });
    }

    const actor = authResult.user;
    const ipAddress = request.headers.get('x-forwarded-for') || '127.0.0.1';
    const userAgent = request.headers.get('user-agent') || 'Unknown';

    const body = await request.json();
    const { userId, role, suspendDays, suspensionReason, unsuspend } = body;

    if (!userId) {
      return NextResponse.json({ error: 'Missing userId' }, { status: 400 });
    }

    // Load target user
    const targetUser = await db.user.findUnique({ where: { id: userId } });
    if (!targetUser) {
      return NextResponse.json({ error: 'Target user not found' }, { status: 404 });
    }

    const now = new Date();

    // 2. Role Promotion Security Check
    if (role && role !== targetUser.role) {
      // Non-admins cannot assign ADMIN role
      if (role === UserRole.ADMIN && actor.role !== UserRole.ADMIN) {
        return NextResponse.json(
          { error: 'Forbidden: Moderators cannot allocate ADMIN roles.' },
          { status: 403 }
        );
      }

      const updated = await db.user.update({
        where: { id: userId },
        data: { role: role as UserRole },
      });

      // Write Audit Log
      await db.auditLog.create({
        data: {
          adminId: actor.id,
          adminNameSnapshot: actor.username,
          action: AuditAction.USER_ROLE_CHANGED,
          targetType: AuditTargetType.USER,
          targetId: userId,
          ipAddress,
          userAgent,
          metadata: {
            before: { role: targetUser.role },
            after: { role: updated.role },
            reason: `Role changed by ${actor.username}`,
          },
        },
      });

      invalidateAdminStatsCache();
      return NextResponse.json({ success: true, user: updated });
    }

    // 3. User Suspension Check
    if (unsuspend) {
      const updated = await db.user.update({
        where: { id: userId },
        data: {
          suspendedUntil: null,
          suspensionReason: null,
        },
      });

      await db.auditLog.create({
        data: {
          adminId: actor.id,
          adminNameSnapshot: actor.username,
          action: AuditAction.USER_UNSUSPENDED,
          targetType: AuditTargetType.USER,
          targetId: userId,
          ipAddress,
          userAgent,
          metadata: {
            before: { suspendedUntil: targetUser.suspendedUntil },
            after: { suspendedUntil: null },
            reason: 'Account unsuspended manually.',
          },
        },
      });

      invalidateAdminStatsCache();
      return NextResponse.json({ success: true, user: updated });
    }

    if (suspendDays !== undefined) {
      const suspendedUntil = new Date();
      suspendedUntil.setDate(suspendedUntil.getDate() + suspendDays);

      const updated = await db.user.update({
        where: { id: userId },
        data: {
          suspendedUntil,
          suspensionReason: suspensionReason || 'Violated terms',
          sessionVersion: { increment: 1 }, // Invalidate current session tokens immediately
        },
      });

      await db.auditLog.create({
        data: {
          adminId: actor.id,
          adminNameSnapshot: actor.username,
          action: AuditAction.USER_SUSPENDED,
          targetType: AuditTargetType.USER,
          targetId: userId,
          ipAddress,
          userAgent,
          metadata: {
            before: { suspendedUntil: targetUser.suspendedUntil },
            after: { suspendedUntil },
            reason: suspensionReason || 'Banned by moderator',
          },
        },
      });

      invalidateAdminStatsCache();
      return NextResponse.json({ success: true, user: updated });
    }

    return NextResponse.json({ error: 'No valid update action provided' }, { status: 400 });
  } catch (error: any) {
    console.error('Admin Users PATCH API Error:', error);
    return NextResponse.json(
      { error: 'Internal Server Error', details: error.message },
      { status: 500 }
    );
  }
}
