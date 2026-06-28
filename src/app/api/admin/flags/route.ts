import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { requirePermission, Permission } from '@/lib/admin/middleware';
import { auth } from '@/auth';
import { FlagStatus, FlagReason, FlagTargetType, FlagSeverity, AuditAction, AuditTargetType, FlagResolution } from '@prisma/client';
import { invalidateAdminStatsCache } from '../stats/route';


export async function GET(request: NextRequest) {
  try {
    // 1. Authorize - Requires MODERATE_CONTENT permission
    const authResult = await requirePermission(Permission.MODERATE_CONTENT);
    if (!authResult.authorized) {
      return NextResponse.json({ error: authResult.error }, { status: authResult.status });
    }

    // Load flagged items ordered by status (PENDING first), severity (HIGH first), and createdAt
    const flags = await db.flaggedItem.findMany({
      include: {
        reports: {
          include: {
            reporter: {
              select: {
                username: true,
                displayName: true,
              },
            },
          },
        },
        claimant: {
          select: {
            username: true,
            displayName: true,
          },
        },
        resolver: {
          select: {
            username: true,
            displayName: true,
          },
        },
      },
      orderBy: [
        { status: 'asc' }, // PENDING first
        { severity: 'desc' }, // HIGH first
        { createdAt: 'asc' }, // Oldest reports first
      ],
    });

    // Map and inject dynamic reports count
    const responseData = flags.map((item) => ({
      ...item,
      reportsCount: item.reports.length,
    }));

    return NextResponse.json({ flags: responseData });
  } catch (error: any) {
    console.error('Admin Flags GET API Error:', error);
    return NextResponse.json(
      { error: 'Internal Server Error', details: error.message },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    // Requires authenticated user
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { targetId, targetType, reason, details } = body;

    if (!targetId || !targetType || !reason) {
      return NextResponse.json({ error: 'Missing required report fields' }, { status: 400 });
    }

    // 1. Validate TargetType and Reason enums
    if (!Object.values(FlagTargetType).includes(targetType)) {
      return NextResponse.json({ error: 'Invalid target type' }, { status: 400 });
    }
    if (!Object.values(FlagReason).includes(reason)) {
      return NextResponse.json({ error: 'Invalid report reason' }, { status: 400 });
    }

    // 2. Upsert the FlaggedItem
    let flaggedItem = await db.flaggedItem.findUnique({
      where: {
        targetType_targetId: {
          targetType: targetType as FlagTargetType,
          targetId,
        },
      },
    });

    if (!flaggedItem) {
      flaggedItem = await db.flaggedItem.create({
        data: {
          targetType: targetType as FlagTargetType,
          targetId,
          status: FlagStatus.PENDING,
          severity: reason === FlagReason.HARASSMENT || reason === FlagReason.COPYRIGHT ? FlagSeverity.HIGH : FlagSeverity.LOW,
          primaryReason: reason as FlagReason,
        },
      });
    }

    // 3. Create Report (with Unique Reporter Constraint)
    try {
      await db.report.create({
        data: {
          flaggedItemId: flaggedItem.id,
          reporterId: session.user.id,
          reason: reason as FlagReason,
          details,
        },
      });
    } catch (dbErr: any) {
      // P2002 Unique constraint failed (already reported by this user)
      if (dbErr.code === 'P2002') {
        return NextResponse.json({
          success: true,
          message: 'You have already reported this item. We are reviewing it.',
        });
      }
      throw dbErr;
    }

    // 4. Dynamic Severity Calculation (consistent rule-based severity)
    const reportsCount = await db.report.count({
      where: { flaggedItemId: flaggedItem.id },
    });

    let calculatedSeverity: FlagSeverity = FlagSeverity.LOW;
    if (
      reportsCount >= 10 || 
      reason === FlagReason.COPYRIGHT || 
      reason === FlagReason.HARASSMENT
    ) {
      calculatedSeverity = FlagSeverity.HIGH;
    } else if (reportsCount >= 3) {
      calculatedSeverity = FlagSeverity.MEDIUM;
    }

    await db.flaggedItem.update({
      where: { id: flaggedItem.id },
      data: { severity: calculatedSeverity },
    });

    invalidateAdminStatsCache();
    return NextResponse.json({ success: true, message: 'Report submitted successfully.' });
  } catch (error: any) {
    console.error('Admin Flags POST API Error:', error);
    return NextResponse.json(
      { error: 'Internal Server Error', details: error.message },
      { status: 500 }
    );
  }
}

export async function PATCH(request: NextRequest) {
  try {
    // 1. Authorize - Requires MODERATE_CONTENT permission
    const authResult = await requirePermission(Permission.MODERATE_CONTENT);
    if (!authResult.authorized) {
      return NextResponse.json({ error: authResult.error }, { status: authResult.status });
    }

    const actor = authResult.user;
    const ipAddress = request.headers.get('x-forwarded-for') || '127.0.0.1';
    const userAgent = request.headers.get('user-agent') || 'Unknown';

    const body = await request.json();
    const { flagId, action, resolutionNote, severity, resolutionType } = body;

    if (!flagId || !action) {
      return NextResponse.json({ error: 'Missing flagId or action' }, { status: 400 });
    }

    const flag = await db.flaggedItem.findUnique({
      where: { id: flagId },
      include: { reports: true },
    });

    if (!flag) {
      return NextResponse.json({ error: 'Flagged item not found' }, { status: 404 });
    }

    const now = new Date();

    // --- CASE A: CLAIM LOCKING (CLAIM / IN_REVIEW) ---
    if (action === 'CLAIM') {
      const claimTimeoutLimit = 30 * 60 * 1000; // 30 minutes
      const isClaimed = flag.status === FlagStatus.IN_REVIEW;
      const isClaimStale = flag.claimedAt && now.getTime() - flag.claimedAt.getTime() > claimTimeoutLimit;

      if (isClaimed && !isClaimStale && flag.claimedBy !== actor.id) {
        return NextResponse.json(
          { error: 'Conflict: This report is currently being reviewed by another moderator.' },
          { status: 409 }
        );
      }

      const updated = await db.flaggedItem.update({
        where: { id: flagId },
        data: {
          status: FlagStatus.IN_REVIEW,
          claimedBy: actor.id,
          claimedAt: now,
        },
      });

      return NextResponse.json({ success: true, flag: updated });
    }

    // --- CASE A2: RELEASE CLAIM ---
    if (action === 'RELEASE') {
      const updated = await db.flaggedItem.update({
        where: { id: flagId },
        data: {
          status: FlagStatus.PENDING,
          claimedBy: null,
          claimedAt: null,
        },
      });

      return NextResponse.json({ success: true, flag: updated });
    }

    // --- CASE B: RESOLUTION & DISMISSAL ---
    if (action === 'RESOLVE' || action === 'DISMISS') {
      const isDismiss = action === 'DISMISS';
      const finalStatus = isDismiss ? FlagStatus.DISMISSED : FlagStatus.RESOLVED;

      // Optimistic Concurrency: Enforce that only the claimant can resolve/dismiss while IN_REVIEW
      const updateResult = await db.flaggedItem.updateMany({
        where: {
          id: flagId,
          claimedBy: actor.id,
          status: FlagStatus.IN_REVIEW,
        },
        data: {
          status: finalStatus,
          resolvedBy: actor.id,
          resolvedAt: now,
          resolutionNote: resolutionNote || null,
          severity: severity ? (severity as FlagSeverity) : undefined,
          resolutionType: resolutionType ? (resolutionType as FlagResolution) : (isDismiss ? FlagResolution.NO_VIOLATION : FlagResolution.CONTENT_REMOVED),
        },
      });

      if (updateResult.count === 0) {
        return NextResponse.json(
          { error: 'Conflict: Report claim has expired, or is currently reviews locked by another moderator.' },
          { status: 409 }
        );
      }

      const updatedFlag = await db.flaggedItem.findUnique({
        where: { id: flagId },
      });

      // Cascade soft delete of reported target entity
      if (!isDismiss) {
        try {
          if (flag.targetType === FlagTargetType.COLLECTION) {
            await db.collection.update({
              where: { id: flag.targetId },
              data: { deletedAt: now },
            });
          } else if (flag.targetType === FlagTargetType.COMMENT) {
            await db.episodeComment.update({
              where: { id: flag.targetId },
              data: { deletedAt: now },
            });
          } else if (flag.targetType === FlagTargetType.THREAD) {
            await db.forumThread.update({
              where: { id: flag.targetId },
              data: { deletedAt: now },
            });
          } else if (flag.targetType === FlagTargetType.PROFILE || flag.targetType === FlagTargetType.USER) {
            await db.user.update({
              where: { id: flag.targetId },
              data: {
                suspendedUntil: new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000), // Default 7 days suspension
                suspensionReason: `Suspended for flag resolution: ${resolutionNote || 'Violated terms'}`,
                sessionVersion: { increment: 1 },
              },
            });
          }
        } catch (cascadeErr) {
          console.error(`Failed to cascade soft-delete flagged content for target ${flag.targetId}:`, cascadeErr);
        }
      }

      // Write Audit Log with Snapshot metadata
      await db.auditLog.create({
        data: {
          adminId: actor.id,
          adminNameSnapshot: actor.username,
          action: isDismiss ? AuditAction.FLAG_DISMISSED : AuditAction.FLAG_RESOLVED,
          targetType: mapFlagTargetToAuditTarget(flag.targetType),
          targetId: flag.targetId,
          ipAddress,
          userAgent,
          metadata: {
            before: { status: flag.status },
            after: { status: finalStatus },
            reason: resolutionNote || `Flag processed by ${actor.username}`,
            snapshot: {
              targetId: flag.targetId,
              targetType: flag.targetType,
            },
          },
        },
      });

      invalidateAdminStatsCache();
      return NextResponse.json({ success: true, flag: updatedFlag });
    }

    return NextResponse.json({ error: 'Invalid action parameter' }, { status: 400 });
  } catch (error: any) {
    console.error('Admin Flags PATCH API Error:', error);
    return NextResponse.json(
      { error: 'Internal Server Error', details: error.message },
      { status: 500 }
    );
  }
}

function mapFlagTargetToAuditTarget(flagType: FlagTargetType): AuditTargetType {
  if (flagType === FlagTargetType.USER || flagType === FlagTargetType.PROFILE) return AuditTargetType.USER;
  if (flagType === FlagTargetType.COLLECTION) return AuditTargetType.COLLECTION;
  if (flagType === FlagTargetType.COMMENT) return AuditTargetType.COMMENT;
  if (flagType === FlagTargetType.THREAD) return AuditTargetType.THREAD;
  return AuditTargetType.SYSTEM;
}
