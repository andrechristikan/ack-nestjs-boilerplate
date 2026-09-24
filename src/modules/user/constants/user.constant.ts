import { EnumActivityLogAction, Prisma } from '@generated/prisma-client/client';
import { HttpStatus } from '@nestjs/common';
import { DocResponseError } from '@common/doc/decorators/doc.decorator';
import { EnumUserStatusCodeError } from '@modules/user/enums/user.status-code.enum';

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
 * User guard error kit for `@UserProtected` (no `auth.error.accessTokenUnauthorized`).
 * @public
 */
export const DocUserErrorResponses = {
    unauthorized: DocResponseError(HttpStatus.UNAUTHORIZED, {
        statusCode: EnumUserStatusCodeError.notAuthenticated,
        messagePath: 'user.error.notAuthenticated',
    }),
    forbidden: DocResponseError(
        HttpStatus.FORBIDDEN,
        {
            statusCode: EnumUserStatusCodeError.notFoundForbidden,
            messagePath: 'user.error.notFound',
        },
        {
            statusCode: EnumUserStatusCodeError.blockedForbidden,
            messagePath: 'user.error.blocked',
        },
        {
            statusCode: EnumUserStatusCodeError.inactiveForbidden,
            messagePath: 'user.error.inactive',
        },
        {
            statusCode: EnumUserStatusCodeError.passwordExpired,
            messagePath: 'auth.error.passwordExpired',
        },
        {
            statusCode: EnumUserStatusCodeError.emailNotVerified,
            messagePath: 'user.error.emailNotVerified',
        }
    ),
} as const;

/**
 * Prisma select of the embedded user reference other records carry.
 * @public
 */
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
 * Backup codes a two-factor read returns: only the ones not yet consumed.
 * @public
 */
export const TwoFactorActiveBackupCodesFilter = {
    usedAt: null,
} satisfies Prisma.TwoFactorBackupCodeWhereInput;

/**
 * Relations joined to a two-factor row that carries its unused backup codes.
 * @public
 */
export const TwoFactorWithBackupCodesInclude = {
    backupCodes: { where: TwoFactorActiveBackupCodesFilter },
} satisfies Prisma.TwoFactorInclude;

/**
 * Relations joined to a user row that carries its role, policies and two-factor state.
 * @public
 */
export const UserWithRoleInclude = {
    role: { include: { policies: true } },
    twoFactor: { include: TwoFactorWithBackupCodesInclude },
} satisfies Prisma.UserInclude;

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
    termsOfServiceAccepted: true,
    privacyAccepted: true,
    cookiesAccepted: true,
    marketingAccepted: true,
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
