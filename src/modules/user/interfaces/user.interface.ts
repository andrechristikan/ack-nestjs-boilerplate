import type { IQueueResponse } from '@common/queue/interfaces/queue.interface';
import type {
    EnumUserProcess,
    EnumUserQueue,
} from '@modules/user/enums/user.enum';
import type { IOutboxEffect } from '@common/outbox/interfaces/outbox.interface';
import { EnumFileExtensionImage } from '@common/file/enums/file.enum';
import {
    EnumActivityLogAction,
    EnumPasswordHistoryType,
    EnumTermPolicyType,
    EnumUserGender,
    EnumUserLoginFrom,
    EnumUserSignUpFrom,
    EnumUserSignUpWith,
    EnumUserStatus,
    EnumVerificationType,
} from '@generated/prisma-client/client';
import type {
    AuthenticationResponseJSON,
    PublicKeyCredentialRequestOptionsJSON,
} from '@simplewebauthn/server';
import type { EnumMfaMethod } from '@modules/mfa/enums/mfa.enum';
import type { IMfaCheck } from '@modules/mfa/interfaces/mfa.interface';
import type {
    Country,
    EnumAwsS3Accessibility,
    EnumUserReauthenticationAction,
    ForgotPassword,
    Prisma,
    User,
    UserMobileNumber,
    UserPhoto,
    Verification,
} from '@generated/prisma-client/client';
import type {
    UserAdminListSelect,
    UserAnalyticRefSelect,
    UserMobileNumberSummarySelect,
    UserNameSelect,
    UserRecipientSelect,
} from '@modules/user/constants/user.constant';
import type {
    IAuthPassword,
    IAuthPasswordTemporary,
    IAuthToken,
} from '@modules/auth/interfaces/auth.interface';
import type { IDeviceIdentity } from '@modules/device/interfaces/device.interface';
import type { IRole, IRoleRef } from '@modules/role/interfaces/role.interface';
import { EnumUserSignUpWorkspaceContextType } from '@modules/user/enums/user.enum';
import type { IActivityLogActorPayload } from '@modules/activity-log/interfaces/activity-log.interface';
import type { IUserCreateVerification } from '@modules/user/interfaces/user.create.interface';

export interface IUserDeletedIdentity {
    email: string;
    username: string;
}

export interface IUserWithPhoto extends User {
    photo: UserPhoto | null;
}

export interface IUser extends IUserWithPhoto {
    role: IRoleRef;
}

export interface IUserContext {
    user: IUser;
}

export interface IUserPasswordSet extends IUser {
    password: string;
}

export type IUserList = Prisma.UserGetPayload<{
    select: typeof UserAdminListSelect;
}>;

export type IUserName = Prisma.UserGetPayload<{
    select: typeof UserNameSelect;
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

export interface IUserSignUpPrepared {
    input: IUserCreateWithWorkspaceInput;
    emailVerification: IUserVerificationEmailCreate;
}

export interface IUserVerificationEmailCreate {
    type: typeof EnumVerificationType.email;
    expiredAt: Date;
    expiredInMinutes: number;
    resendInMinutes: number;
    reference: string;
    token: string;
    hashedToken: string;
    link: string;
}

export interface IUserVerificationReauthenticationCreate {
    verification: IUserCreateVerification;
    otp: string;
    action: EnumUserReauthenticationAction;
    expiredInMinutes: number;
}

export interface IUserVerificationMobileCreate {
    verification: IUserCreateVerification;
    otp: string;
    expiredInMinutes: number;
}

export interface IUserVerificationEmailTarget {
    verification: Verification;
    user: User;
}

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
    workspaceMemberRoleId: string;
    projectId: string | null;
    projectMemberRoleId: string | null;
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
    password: IAuthPasswordTemporary;
    passwordString: string;
}

export interface IUserImport {
    username: string;
    email: string;
    name: string | null;
}

export interface IUserImportPrepared {
    inputs: IUserCreateWithWorkspaceInput[];
    passwordHasheds: IAuthPasswordTemporary[];
    passwordStrings: string[];
}

export interface IUserUpdateProfile {
    name: string | null;
    countryId: string;
    gender: EnumUserGender;
}

export interface IUserUpdateStatus {
    status: EnumUserStatus;
    passwordAttempt: number;
    passwordLockedUntil: Date | null;
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

export interface IUserCredential {
    user: IUser;
    hashedPassword: string;
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
    password: IAuthPasswordTemporary;
    passwordString: string;
}

export interface IUserForgotPassword extends ForgotPassword {
    user: IUser;
}

export interface IUserForgotPasswordPrepared {
    user: User;
    forgot: IUserForgotPasswordCreate;
}

export interface IUserReauthenticationInput {
    action: EnumUserReauthenticationAction;
    password: string | null;
    method: EnumMfaMethod | null;
    code: string | null;
    backupCode: string | null;
    passkeyChallengeToken: string | null;
    passkeyResponse: AuthenticationResponseJSON | null;
    otp: string | null;
}

export interface IUserReauthenticationCheck {
    isPasswordChecked: boolean;
    mfa: IMfaCheck | null;
    verificationId: string | null;
    passkeyChallengeToken: string | null;
}

export interface IUserLoginMfaChallenge {
    challengeToken: string;
    expiresInMs: number;
    methods: EnumMfaMethod[];
    passkeyOptions: PublicKeyCredentialRequestOptionsJSON | null;
}

interface IUserLoginOutcomeBase {
    lastWorkspaceId: string | null;
    lastWorkspaceChangedAt: Date | null;
}

export interface IUserLoginTokenOutcome extends IUserLoginOutcomeBase {
    isMfaRequired: false;
    tokens: IAuthToken;
    mfa?: never;
}

export interface IUserLoginMfaOutcome extends IUserLoginOutcomeBase {
    isMfaRequired: true;
    mfa: IUserLoginMfaChallenge;
    tokens?: never;
}

export type IUserLoginOutcome = IUserLoginTokenOutcome | IUserLoginMfaOutcome;

export interface IUserAnalyticGroupCount<T extends string = string> {
    key: T;
    count: number;
}

export type IUserAnalyticRef = Prisma.UserGetPayload<{
    select: typeof UserAnalyticRefSelect;
}>;

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
    access: EnumAwsS3Accessibility;
}

export interface IUserImportByAdminPayload {
    rows: IUserImport[];
    activityLog: IActivityLogActorPayload;
    created: number | null;
}

export interface IUserCreateContracts {
    signUp: IUserCreateContract;
    social: IUserCreateContract;
    admin: IUserCreateContract;
}

export interface IUserDeletePhotoEffect extends IOutboxEffect {
    queue: EnumUserQueue.user;
    name: EnumUserProcess.deletePhoto;
    data: IUserDeletePhotoPayload;
}

export interface IUserImportByAdminEffect extends IOutboxEffect {
    queue: EnumUserQueue.user;
    name: EnumUserProcess.importByAdmin;
    data: IUserImportByAdminPayload;
}

export interface IUserDeletePhotoQueueResponse extends IQueueResponse {
    key: string;
}

export interface IUserImportByAdminQueueResponse extends IQueueResponse {
    created: number;
    failed: number;
}

export interface IUserPurgeExpiredQueueResponse extends IQueueResponse {
    sessions: number;
    mfaChallenges: number;
    passwordHistories: number;
    verifications: number;
    forgotPasswords: number;
}
