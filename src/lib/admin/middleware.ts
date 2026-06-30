import { auth } from '@/auth';
import { db } from '@/lib/db';
import { UserRole } from '@prisma/client';

export enum Permission {
  MANAGE_USERS = 'MANAGE_USERS',
  MODERATE_CONTENT = 'MODERATE_CONTENT',
  MANAGE_SYSTEM = 'MANAGE_SYSTEM',
  VIEW_ANALYTICS = 'VIEW_ANALYTICS',
}

// Role-to-Permissions static mapping for future-proof scalability
const ROLE_PERMISSIONS: Record<UserRole, Permission[]> = {
  USER: [],
  MODERATOR: [Permission.MODERATE_CONTENT, Permission.VIEW_ANALYTICS],
  ADMIN: [
    Permission.MANAGE_USERS,
    Permission.MODERATE_CONTENT,
    Permission.MANAGE_SYSTEM,
    Permission.VIEW_ANALYTICS,
  ],
};

export interface AuthValidationResult {
  authorized: boolean;
  user?: any;
  error?: string;
  status: number;
}

export async function validateSessionAndRole(
  allowedRoles?: UserRole[],
  requiredPermission?: Permission
): Promise<AuthValidationResult> {
  const session = await auth();
  if (!session?.user?.id) {
    return { authorized: false, error: 'Unauthorized', status: 401 };
  }

  // Load the user from the database to check the latest role and suspension status
  const user = await db.user.findUnique({
    where: { id: session.user.id },
  });

  if (!user) {
    return { authorized: false, error: 'User not found', status: 404 };
  }

  // 1. Suspension Check (Immediate Revocation)
  if (user.suspendedUntil && user.suspendedUntil > new Date()) {
    const reason = user.suspensionReason ? `: ${user.suspensionReason}` : '';
    return {
      authorized: false,
      error: `Account suspended until ${user.suspendedUntil.toISOString()}${reason}`,
      status: 403,
    };
  }

  // 2. Role Check
  if (allowedRoles && allowedRoles.length > 0) {
    if (!allowedRoles.includes(user.role)) {
      return { authorized: false, error: 'Forbidden: Insufficient role permissions', status: 403 };
    }
  }

  // 3. Permission Check
  if (requiredPermission) {
    const userPermissions = ROLE_PERMISSIONS[user.role] || [];
    if (!userPermissions.includes(requiredPermission)) {
      return { authorized: false, error: 'Forbidden: Insufficient permissions', status: 403 };
    }
  }

  return { authorized: true, user, status: 200 };
}

// Helper: Require Admin role
export async function requireAdmin() {
  return validateSessionAndRole([UserRole.ADMIN]);
}

// Helper: Require Moderator or Admin
export async function requireModerator() {
  return validateSessionAndRole([UserRole.ADMIN, UserRole.MODERATOR]);
}

// Helper: Require any role from a list
export async function requireAnyRole(roles: UserRole[]) {
  return validateSessionAndRole(roles);
}

// Helper: Require granular permission
export async function requirePermission(permission: Permission) {
  return validateSessionAndRole(undefined, permission);
}
