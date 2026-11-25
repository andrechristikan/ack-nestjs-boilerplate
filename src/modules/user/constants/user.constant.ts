import { EnumActivityLogAction, Prisma } from '@generated/prisma-client/client';
import { HttpStatus } from '@nestjs/common';
import type { IDocResponseEntry } from '@common/doc/interfaces/doc.interface';
import { EnumUserStatusCodeError } from '@modules/user/enums/user.status-code.enum';
import { EnumAuthStatusCodeError } from '@modules/auth/enums/auth.status-code.enum';
import { RoleWithPoliciesInclude } from '@modules/role/constants/role.constant';

/** @public */
export const UserContextStoreKey = 'UserContextStoreKey';

/** @public */
export const UserGuardIsVerifiedMetaKey = 'UserGuardIsVerifiedMetaKey';

/** @public */
export const UserImportEncryptionPurpose = 'user.import';

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
    name: true,
} satisfies Prisma.UserSelect;

/** @public */
export const UserStateSelect = {
    id: true,
    status: true,
    isVerified: true,
    deletedAt: true,
    passwordAttempt: true,
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
export const UserWithRoleInclude = {
    role: { include: RoleWithPoliciesInclude },
} satisfies Prisma.UserInclude;

/** @public */
export const UserMobileNumberWithCountryInclude = {
    country: true,
} satisfies Prisma.UserMobileNumberInclude;

/** @public */
export const UserProfileInclude = {
    ...UserWithRoleInclude,
    country: true,
    mobileNumbers: { include: UserMobileNumberWithCountryInclude },
} satisfies Prisma.UserInclude;

/** @public */
export const UserForgotPasswordWithUserRecipientInclude = {
    user: { select: UserRecipientSelect },
} satisfies Prisma.ForgotPasswordInclude;

/** @public */
export const UserVerificationWithUserStateInclude = {
    user: { select: UserStateSelect },
} satisfies Prisma.VerificationInclude;

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
    lastIpAddress: true,
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
        include: RoleWithPoliciesInclude,
    },
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
    EnumActivityLogAction.userLoggedInWithCredential,
    EnumActivityLogAction.userLoggedInWithGoogle,
    EnumActivityLogAction.userLoggedInWithApple,
    EnumActivityLogAction.userLoggedInWithPasskey,
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

/** @public */
export const UserPasswordMinLength = 8;

/** @public */
export const UserPasswordMaxLength = 64;

/** @public */
export const UserDigitsRegex = /^[0-9]+$/;

/** @public */
export const UserBackupCodeRegex = /^[A-Z0-9]+$/;

/** @public */
export const UserBadWordSeparatorRegex = /[^a-zA-Z]+/g;
