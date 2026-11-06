import { EnumActivityLogAction, Prisma } from '@generated/prisma-client/client';
import { HttpStatus } from '@nestjs/common';
import type { IDocResponseEntry } from '@common/doc/interfaces/doc.interface';
import { EnumUserStatusCodeError } from '@modules/user/enums/user.status-code.enum';
import { EnumAuthStatusCodeError } from '@modules/auth/enums/auth.status-code.enum';

/**
 * Route metadata key holding whether `@UserProtected` requires a verified user.
 * @public
 */
export const UserGuardIsVerifiedMetaKey = 'UserGuardIsVerifiedMetaKey';

/**
 * Request-store key holding the loaded current user.
 * @public
 */
export const UserStoreKey = 'UserStoreKey';

/**
 * Characters a valid username holds: letters, digits, dash, and underscore.
 * @public
 */
export const UserUsernameRegex = /^[a-zA-Z0-9-_]+$/;

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
 * Prisma where matching a user that is not deleted, whatever its status.
 * @public
 */
export const UserNotDeletedWhere = {
    deletedAt: null,
} satisfies Prisma.UserWhereInput;

/**
 * Columns a notification recipient snapshot reads from a user.
 * @public
 */
export const UserRecipientSelect = {
    id: true,
    email: true,
    username: true,
} satisfies Prisma.UserSelect;

/**
 * Cursor scope of the internal active-recipient read.
 * @public
 */
export const UserActiveRecipientCursorScope = 'UserActiveRecipientCursorScope';

/**
 * Columns a mobile number summary read returns.
 * @public
 */
export const UserMobileNumberSummarySelect = {
    id: true,
    number: true,
    phoneCode: true,
    isVerified: true,
} satisfies Prisma.UserMobileNumberSelect;

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

/**
 * Error entries `@UserProtected` documents: the missing account, the blocked, inactive, password-expired, and unverified user, and the missing JWT payload.
 * @public
 */
export const UserProtectedDocErrors: IDocResponseEntry[] = [
    {
        httpStatus: HttpStatus.UNAUTHORIZED,
        statusCode: EnumUserStatusCodeError.accountNotFound,
        messagePath: 'user.error.accountNotFound',
    },
    {
        httpStatus: HttpStatus.FORBIDDEN,
        statusCode: EnumUserStatusCodeError.blockedForbidden,
        messagePath: 'user.error.blocked',
    },
    {
        httpStatus: HttpStatus.FORBIDDEN,
        statusCode: EnumUserStatusCodeError.inactiveForbidden,
        messagePath: 'user.error.inactive',
    },
    {
        httpStatus: HttpStatus.FORBIDDEN,
        statusCode: EnumUserStatusCodeError.passwordExpired,
        messagePath: 'user.error.passwordExpired',
    },
    {
        httpStatus: HttpStatus.FORBIDDEN,
        statusCode: EnumUserStatusCodeError.emailNotVerified,
        messagePath: 'user.error.emailNotVerified',
    },
    {
        httpStatus: HttpStatus.UNAUTHORIZED,
        statusCode: EnumAuthStatusCodeError.jwtGuardMissing,
        messagePath: 'auth.error.jwtGuardMissing',
    },
];
