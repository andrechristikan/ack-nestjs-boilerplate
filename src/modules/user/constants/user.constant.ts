import { EnumActivityLogAction, Prisma } from '@generated/prisma-client/client';

/**
 * Route metadata key holding whether `@UserProtected` requires a verified user.
 * @public
 */
export const UserGuardIsVerifiedMetaKey = 'UserGuardIsVerifiedMetaKey';

/**
 * Request-store key holding the loaded current user.
 * @public
 */
export const UserStoreKey = 'UserStore';

/**
 * Matches a `TwoFactorBackupCode` the user can still spend — a consumed code is never read back.
 */
export const TwoFactorActiveBackupCodesFilter: Prisma.TwoFactorBackupCodeWhereInput =
    {
        usedAt: null,
    };

export const UserRefSelect = {
    id: true,
    name: true,
    username: true,
    photo: true,
    createdAt: true,
    createdBy: true,
    updatedAt: true,
    updatedBy: true,
    deletedAt: true,
    deletedBy: true,
} satisfies Prisma.UserSelect;

/**
 * Columns an admin user list read returns; the password hash is never among them.
 * @public
 */
export const UserAdminListSelect = {
    id: true,
    name: true,
    username: true,
    isVerified: true,
    verifiedAt: true,
    email: true,
    roleId: true,
    passwordExpired: true,
    passwordCreated: true,
    passwordAttempt: true,
    signUpAt: true,
    signUpFrom: true,
    signUpWith: true,
    status: true,
    gender: true,
    countryId: true,
    lastLoginAt: true,
    lastIPAddress: true,
    lastLoginFrom: true,
    lastLoginWith: true,
    lastWorkspaceId: true,
    lastWorkspaceChangedAt: true,
    photo: true,
    createdAt: true,
    createdBy: true,
    updatedAt: true,
    updatedBy: true,
    deletedAt: true,
    deletedBy: true,
    role: {
        include: {
            policies: true,
        },
    },
    twoFactor: true,
} satisfies Prisma.UserSelect;

/**
 * Columns the admin near-lockout analytic list reads from a user row.
 * @public
 */
export const UserAdminNearLockoutSelect = {
    id: true,
    email: true,
    passwordAttempt: true,
    lastLoginAt: true,
    createdAt: true,
} satisfies Prisma.UserSelect;

/**
 * Activity log actions counted as a successful login by the user login analytics.
 * @public
 */
export const UserLoginAnalyticActions: EnumActivityLogAction[] = [
    EnumActivityLogAction.userLoginCredential,
    EnumActivityLogAction.userLoginGoogle,
    EnumActivityLogAction.userLoginApple,
];
