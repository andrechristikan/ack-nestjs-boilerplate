import { EnumActivityLogAction, Prisma } from '@generated/prisma-client/client';
import { HttpStatus } from '@nestjs/common';
import type { IDocResponseEntry } from '@common/doc/interfaces/doc.interface';
import { EnumUserStatusCodeError } from '@modules/user/enums/user.status-code.enum';
import { EnumAuthStatusCodeError } from '@modules/auth/enums/auth.status-code.enum';

/** @public */
export const UserGuardIsVerifiedMetaKey = 'UserGuardIsVerifiedMetaKey';

/** @public */
export const UserStoreKey = 'UserStoreKey';

/** @public */
export const UserUsernameRegex = /^[a-zA-Z0-9-_]+$/;

/** @public */
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

/** @public */
export const UserNotDeletedWhere = {
    deletedAt: null,
} satisfies Prisma.UserWhereInput;

/** @public */
export const UserRecipientSelect = {
    id: true,
    email: true,
    username: true,
} satisfies Prisma.UserSelect;

/** @public */
export const UserActiveRecipientCursorScope = 'UserActiveRecipientCursorScope';

/** @public */
export const UserMobileNumberSummarySelect = {
    id: true,
    number: true,
    phoneCode: true,
    isVerified: true,
} satisfies Prisma.UserMobileNumberSelect;

/** @public */
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

/** @public */
export const UserAdminNearLockoutSelect = {
    id: true,
    email: true,
    passwordAttempt: true,
    lastLoginAt: true,
    createdAt: true,
} satisfies Prisma.UserSelect;

/** @public */
export const UserLoginAnalyticActions: EnumActivityLogAction[] = [
    EnumActivityLogAction.userLoginCredential,
    EnumActivityLogAction.userLoginGoogle,
    EnumActivityLogAction.userLoginApple,
    EnumActivityLogAction.userLoginGithub,
];

/** @public */
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
