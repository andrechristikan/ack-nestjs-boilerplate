import { EnumFileExtensionImage } from '@common/file/enums/file.enum';
import {
    EnumActivityLogAction,
    EnumPasswordHistoryType,
    EnumProjectMemberRole,
    EnumTermPolicyType,
    EnumUserGender,
    EnumUserLoginFrom,
    EnumUserSignUpFrom,
    EnumUserSignUpWith,
    EnumUserStatus,
    EnumWorkspaceMemberRole,
} from '@generated/prisma-client/client';
import type { EnumAuthTwoFactorMethod } from '@modules/auth/enums/auth.enum';
import type { IActivityLogStageInput } from '@modules/activity-log/interfaces/activity-log.interface';
import type {
    Country,
    ForgotPassword,
    Prisma,
    TwoFactor,
    User,
    UserMobileNumber,
    UserPhoto,
    Verification,
} from '@generated/prisma-client/client';
import type {
    UserAdminListSelect,
    UserMobileNumberSummarySelect,
    UserRecipientSelect,
} from '@modules/user/constants/user.constant';
import type {
    IAuthPassword,
    IAuthToken,
} from '@modules/auth/interfaces/auth.interface';
import type { IDeviceIdentity } from '@modules/device/interfaces/device.interface';
import type {
    IRole,
    IRoleWithPolicies,
} from '@modules/role/interfaces/role.interface';
import { EnumUserSignUpWorkspaceContextType } from '@modules/user/enums/user.enum';
import type { IUserCreateVerification } from '@modules/user/interfaces/user.create.interface';

export interface IUserDeletedIdentity {
    email: string;
    username: string;
}

export interface IUser extends User {
    role: IRoleWithPolicies;
    twoFactor: TwoFactor | null;
}

export interface IUserTwoFactorEnabled extends IUser {
    twoFactor: TwoFactor;
}

export interface IUserPasswordSet extends IUser {
    password: string;
}

export type IUserList = Prisma.UserGetPayload<{
    select: typeof UserAdminListSelect;
}>;

export type IUserRecipient = Prisma.UserGetPayload<{
    select: typeof UserRecipientSelect;
}>;

export interface IUserRef {
    id: string;
    name: string | null;
    username: string;
    photo: UserPhoto | null;
    createdAt: Date;
    createdBy: string | null;
    updatedAt: Date;
    updatedBy: string | null;
    deletedAt: Date | null;
    deletedBy: string | null;
}

export interface IUserMobileNumber extends UserMobileNumber {
    country: Country;
}

export interface IUserProfile extends IUser {
    mobileNumbers: IUserMobileNumber[];
    country: Country;
}

export interface IUserForgotPasswordCreate {
    expiredAt: Date;
    expiredInMinutes: number;
    resendInMinutes: number;
    reference: string;
    token: string;
    hashedToken: string;
    link: string;
}

export interface IUserVerificationEmailCreate {
    type: 'email';
    expiredAt: Date;
    expiredInMinutes: number;
    resendInMinutes: number;
    reference: string;
    token: string;
    hashedToken: string;
    link: string;
}

export interface IUserVerificationEmailTarget {
    verification: Verification;
    user: User;
}

export interface IUserVerificationMobileNumberCreate {
    type: 'mobileNumber';
    expiredAt: Date;
    expiredInMinutes: number;
    resendInMinutes: number;
    reference: string;
    token: string;
    hashedToken: string;
}

export type IUserVerificationCreate =
    IUserVerificationEmailCreate | IUserVerificationMobileNumberCreate;

export interface IUserSignUpWorkspacePersonal {
    type: EnumUserSignUpWorkspaceContextType.personal;
    workspaceId: string;
    slugCandidates: string[];
    name: string;
}

export interface IUserSignUpWorkspaceInvite {
    type: EnumUserSignUpWorkspaceContextType.invite;
    workspaceId: string;
    workspaceInviteId: string;
    invitedByUserId: string;
    workspaceMemberRole: EnumWorkspaceMemberRole;
    projectId: string | null;
    projectMemberRole: EnumProjectMemberRole | null;
}

export type IUserSignUpWorkspaceContext =
    IUserSignUpWorkspacePersonal | IUserSignUpWorkspaceInvite;

export type IUserCreateRole = Pick<IRole, 'id'>;

export interface IUserSignUpResolved {
    roleId: string;
    workspaceContext: IUserSignUpWorkspaceContext;
}

export interface IUserCreateContract {
    createdAction: EnumActivityLogAction;
    logsVerificationEmailRequest: boolean;
    passwordHistoryType: EnumPasswordHistoryType | null;
    personalWorkspaceAction: EnumActivityLogAction;
    logsActingAdmin: boolean;
}

export interface IUserTermPolicyContract {
    requiredTypes: EnumTermPolicyType[];
}

export interface IUserCreateWithWorkspaceInput {
    userId: string;
    email: string;
    name: string | null;
    username: string;
    countryId: string;
    roleId: string;
    signUpFrom: EnumUserSignUpFrom;
    signUpWith: EnumUserSignUpWith;
    isVerified: boolean;
    verifiedAt: Date | null;
    acceptedTermPolicyTypes: EnumTermPolicyType[];
    password: IAuthPassword | null;
    passwordHistoryType: EnumPasswordHistoryType | null;
    verification: IUserCreateVerification | null;
    workspaceContext: IUserSignUpWorkspaceContext;
    createdBy: string;
}

export interface IUserCheckEmail {
    badWord: boolean;
    exist: boolean;
}

export interface IUserCheckUsername extends IUserCheckEmail {
    pattern: boolean;
}

export interface IUserImportUsernameChecks {
    existing: string[];
    badWords: boolean[];
}

export interface IUserCreateByAdmin {
    username: string;
    email: string;
    name: string | null;
    roleId: string;
    countryId: string;
}

export interface IUserCreateByAdminPrepared {
    input: IUserCreateWithWorkspaceInput;
    passwordString: string;
}

export interface IUserImport {
    username: string;
    email: string;
    name: string | null;
}

export interface IUserImportPrepared {
    inputs: IUserCreateWithWorkspaceInput[];
    passwordHasheds: IAuthPassword[];
    passwordStrings: string[];
}

export interface IUserUpdateProfile {
    name: string | null;
    countryId: string;
    gender: EnumUserGender;
}

export interface IUserUpdateStatus {
    status: EnumUserStatus;
    passwordAttempt: number | null;
}

export interface IUserGeneratePhotoProfile {
    extension: EnumFileExtensionImage;
    size: number;
}

export interface IUserUpdatePhotoProfile {
    key: string;
}

export type IUserMobileNumberSummary = Prisma.UserMobileNumberGetPayload<{
    select: typeof UserMobileNumberSummarySelect;
}>;

export interface IUserMobileNumberInput {
    number: string;
    phoneCode: string;
    countryId: string;
}

export interface IUserCredentialAttempt {
    user: IUser;
    hashedPassword: string;
    isAttemptCounted: boolean;
    lockoutStages: IActivityLogStageInput<EnumActivityLogAction>[];
}

export interface IUserTwoFactorAttempt {
    isAttemptCounted: boolean;
    lockoutStages: IActivityLogStageInput<EnumActivityLogAction>[];
}

export interface IUserLoginSocial {
    username: string;
    name: string | null;
    countryId: string;
    from: EnumUserLoginFrom;
    device: IDeviceIdentity;
    cookies: boolean;
    marketing: boolean;
    inviteToken: string | null;
}

export interface IUserSignUp {
    username: string;
    email: string;
    name: string | null;
    countryId: string;
    password: string;
    from: EnumUserSignUpFrom;
    cookies: boolean;
    marketing: boolean;
    inviteToken: string | null;
}

export interface IUserPasswordTemporary {
    password: IAuthPassword;
    passwordString: string;
}

export interface IUserForgotPassword extends ForgotPassword {
    user: IUser;
}

export interface IUserForgotPasswordPrepared {
    user: User;
    forgot: IUserForgotPasswordCreate;
}

export interface IUserTwoFactorStatus {
    isEnabled: boolean;
    isPendingConfirmation: boolean;
    backupCodesRemaining: number;
    confirmedAt: Date | null;
    lastUsedAt: Date | null;
}

export interface IUserTwoFactorLoginSetup {
    user: IUser;
    pendingSecret: string;
}

export interface IUserTwoFactorSetup {
    secret: string;
    otpauthUrl: string;
}

export interface IUserTwoFactorSetupSecret extends IUserTwoFactorSetup {
    encryptedSecret: string;
}

export interface IUserTwoFactorVerifyInput {
    method: EnumAuthTwoFactorMethod | null;
    code: string | null;
    backupCode: string | null;
}

export interface IUserTwoFactorVerifyResult {
    method: EnumAuthTwoFactorMethod;
    newBackupCodes: string[] | null;
}

export interface IUserTwoFactorChecked {
    verified: IUserTwoFactorVerifyResult;
    totpStep: number | null;
}

interface IUserLoginTwoFactorChallengeBase {
    challengeToken: string;
    challengeExpiresInMs: number;
    backupCodesRemaining: number;
}

export interface IUserLoginTwoFactorSetupChallenge extends IUserLoginTwoFactorChallengeBase {
    isRequiredSetup: true;
    otpauthUrl: string;
    secret: string;
}

export interface IUserLoginTwoFactorVerifyChallenge extends IUserLoginTwoFactorChallengeBase {
    isRequiredSetup: false;
}

export type IUserLoginTwoFactorChallenge =
    IUserLoginTwoFactorSetupChallenge | IUserLoginTwoFactorVerifyChallenge;

interface IUserLoginOutcomeBase {
    lastWorkspaceId: string | null;
    lastWorkspaceChangedAt: Date | null;
}

export interface IUserLoginTokenOutcome extends IUserLoginOutcomeBase {
    isTwoFactorEnable: false;
    tokens: IAuthToken;
    twoFactor?: never;
}

export interface IUserLoginTwoFactorOutcome extends IUserLoginOutcomeBase {
    isTwoFactorEnable: true;
    twoFactor: IUserLoginTwoFactorChallenge;
    tokens?: never;
}

export type IUserLoginOutcome =
    IUserLoginTokenOutcome | IUserLoginTwoFactorOutcome;

export interface IUserAnalyticGroupCount<T extends string = string> {
    key: T;
    count: number;
}

export interface IUserAnalyticRef {
    id: string;
    email: string;
    passwordAttempt: number | null;
}

export interface IUserForgotPasswordAnalyticUserCount {
    userId: string;
    count: number;
}

export interface IUserVerificationAnalyticUsedBucket {
    isUsed: boolean;
    count: number;
}

export interface IUserDeletePhotoPayload {
    userId: string;
    key: string;
    access: string;
}

export interface IUserLockoutPayload {
    userId: string;
}

export type IUserField = Extract<keyof IUser, string>;

export type IUserFieldValue = NonNullable<IUser[IUserField]>;

export interface IUserCreateContracts {
    signUp: IUserCreateContract;
    social: IUserCreateContract;
    admin: IUserCreateContract;
}
