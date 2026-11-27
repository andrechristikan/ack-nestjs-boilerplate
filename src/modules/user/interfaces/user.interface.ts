import type { IQueueResponse } from '@common/queue/interfaces/queue.interface';
import type {
    EnumUserAuthProcess,
    EnumUserProcess,
    EnumUserQueue,
} from '@modules/user/enums/user.enum';
import type { IOutboxEffect } from '@common/outbox/interfaces/outbox.interface';
import type { IAwsS3 } from '@common/aws/interfaces/aws.interface';
import { EnumFileExtensionImage } from '@common/file/enums/file.enum';
import {
    EnumActivityLogAction,
    EnumPasswordHistoryType,
    EnumProjectMemberRole,
    EnumTermPolicyType,
    EnumUserGender,
    EnumUserLoginFrom,
    EnumUserLoginWith,
    EnumUserSignUpFrom,
    EnumUserSignUpWith,
    EnumUserStatus,
    EnumVerificationType,
    EnumWorkspaceMemberRole,
} from '@generated/prisma-client/client';
import type { PublicKeyCredentialRequestOptionsJSON } from '@simplewebauthn/server';
import type { EnumMfaMethod } from '@modules/mfa/enums/mfa.enum';
import type { IMfaReauthenticationInput } from '@modules/mfa/interfaces/mfa.interface';
import type {
    Country,
    EnumAwsS3Accessibility,
    EnumUserReauthenticationAction,
    Prisma,
    User,
    UserMobileNumber,
    UserPhoto,
    Verification,
} from '@generated/prisma-client/client';
import type {
    UserAdminListSelect,
    UserForgotPasswordWithUserRecipientInclude,
    UserMobileNumberSummarySelect,
    UserRecipientSelect,
    UserVerificationWithUserStateInclude,
} from '@modules/user/constants/user.constant';
import type {
    IAuthPassword,
    IAuthPasswordTemporary,
    IAuthToken,
} from '@modules/auth/interfaces/auth.interface';
import type { IDeviceIdentity } from '@modules/device/interfaces/device.interface';
import type {
    IRole,
    IRoleWithPolicies,
} from '@modules/role/interfaces/role.interface';
import { EnumUserCreateWorkspaceContextType } from '@modules/user/enums/user.enum';
import type { IActivityLogActorPayload } from '@modules/activity-log/interfaces/activity-log.interface';
import type { IUserCreateVerification } from '@modules/user/interfaces/user.create.interface';
import type { ISessionRef } from '@modules/session/interfaces/session.interface';

export interface IUserDeletedIdentity {
    email: string;
    username: string;
}

export interface IUser extends User {
    role: IRoleWithPolicies;
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

export type IUserName = Pick<User, 'name' | 'username'>;

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

export interface IUserRegistrationPrepared {
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

export type IUserVerificationWithUser = Prisma.VerificationGetPayload<{
    include: typeof UserVerificationWithUserStateInclude;
}>;

export interface IUserVerificationEmailTarget {
    verification: Verification;
    user: IUserVerificationWithUser['user'];
}

export interface IUserCreateWorkspacePersonal {
    type: EnumUserCreateWorkspaceContextType.personal;
    workspaceId: string;
    slugCandidates: string[];
    name: string;
}

export interface IUserCreateWorkspaceInvite {
    type: EnumUserCreateWorkspaceContextType.invite;
    workspaceId: string;
    workspaceInviteId: string;
    invitedByUserId: string;
    workspaceMemberRole: EnumWorkspaceMemberRole;
    projectId: string | null;
    projectMemberRole: EnumProjectMemberRole | null;
}

export type IUserCreateWorkspaceContext =
    IUserCreateWorkspacePersonal | IUserCreateWorkspaceInvite;

export type IUserCreateRole = Pick<IRole, 'id'>;

export interface IUserRegistrationResolved {
    roleId: string;
    workspaceContext: IUserCreateWorkspaceContext;
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

export interface IUserCreateLogin {
    loginAt: Date;
    ipAddress: string | null;
    loginFrom: EnumUserLoginFrom;
    loginWith: EnumUserLoginWith;
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
    login: IUserCreateLogin | null;
    workspaceContext: IUserCreateWorkspaceContext;
    createdAt: Date;
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

export interface IUserImportChecks {
    existingEmails: string[];
    usernameChecks: IUserImportUsernameChecks;
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

export interface IUserImportEncrypted extends Omit<IUserImport, 'email'> {
    encryptedEmail: string;
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

export interface IUserPhotoProfileCheck {
    isSizeAllowed: boolean;
    isContentValid: boolean;
    photo: IAwsS3;
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

export interface IUserRegistration {
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

export type IUserForgotPassword = Prisma.ForgotPasswordGetPayload<{
    include: typeof UserForgotPasswordWithUserRecipientInclude;
}>;

export interface IUserForgotPasswordPrepared {
    user: User;
    forgot: IUserForgotPasswordCreate;
}

export interface IUserReauthenticationInput extends IMfaReauthenticationInput {
    password: string | null;
    otp: string | null;
}

export interface IUserPasswordAttemptLimit {
    maxAttempts: number;
    lockedUntil: Date;
}

export interface IUserReauthenticationPasswordResult {
    isPasswordChecked: boolean;
    limit: IUserPasswordAttemptLimit | null;
}

export interface IUserAuthMfaChallenge {
    challengeToken: string;
    expiresInMs: number;
    methods: EnumMfaMethod[];
    passkeyOptions: PublicKeyCredentialRequestOptionsJSON | null;
}

interface IUserAuthOutcomeBase {
    lastWorkspaceId: string | null;
    lastWorkspaceChangedAt: Date | null;
}

export interface IUserAuthTokenOutcome extends IUserAuthOutcomeBase {
    isMfaRequired: false;
    tokens: IAuthToken;
    mfa?: never;
}

export interface IUserAuthMfaOutcome extends IUserAuthOutcomeBase {
    isMfaRequired: true;
    mfa: IUserAuthMfaChallenge;
    tokens?: never;
}

export type IUserAuthOutcome = IUserAuthTokenOutcome | IUserAuthMfaOutcome;

export interface IUserDeletePhotoPayload {
    userId: string;
    key: string;
    access: EnumAwsS3Accessibility;
}

export interface IUserImportByAdminEncryptedPayload {
    rows: IUserImportEncrypted[];
    activityLog: IActivityLogActorPayload;
    created: number | null;
}

export interface IUserExportByAdminPayload {
    status: EnumUserStatus[];
    roleId: string | null;
    countryId: string | null;
    activityLog: IActivityLogActorPayload;
    exported: number | null;
}

export interface IUserDeleteSelfPayload {
    userId: string;
    ownedWorkspaceIds: string[];
    activityLog: IActivityLogActorPayload;
}

export interface IUserPurgeLoginsPayload {
    userId: string;
    sessions: ISessionRef[];
}

export interface IUserExport {
    id: string;
    createdAt: Date;
    createdBy: string | null;
    updatedAt: Date;
    updatedBy: string | null;
    deletedAt: Date | null;
    deletedBy: string | null;
    name: string | null;
    username: string;
    isVerified: boolean;
    verifiedAt: Date | null;
    email: string;
    roleId: string;
    status: EnumUserStatus;
    countryId: string;
    photo: string | null;
    role: string;
}

export interface IUserExportUploaded {
    count: number;
    link: string;
    expiredAt: string;
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
    data: IUserImportByAdminEncryptedPayload;
}

export interface IUserExportByAdminEffect extends IOutboxEffect {
    queue: EnumUserQueue.user;
    name: EnumUserProcess.exportByAdmin;
    data: IUserExportByAdminPayload;
}

export interface IUserDeleteSelfEffect extends IOutboxEffect {
    queue: EnumUserQueue.user;
    name: EnumUserProcess.deleteSelf;
    data: IUserDeleteSelfPayload;
}

export interface IUserPurgeLoginsEffect extends IOutboxEffect {
    queue: EnumUserQueue.userAuth;
    name: EnumUserAuthProcess.purgeLogins;
    data: IUserPurgeLoginsPayload;
}

export interface IUserDeletePhotoQueueResponse extends IQueueResponse {
    key: string;
}

export interface IUserImportByAdminQueueResponse extends IQueueResponse {
    created: number;
}

export interface IUserExportByAdminQueueResponse extends IQueueResponse {
    exported: number;
}

export interface IUserPurgeExpiredQueueResponse extends IQueueResponse {
    sessions: number;
    mfaChallenges: number;
    passwordHistories: number;
    verifications: number;
    forgotPasswords: number;
}

export interface IUserPurgeLoginsQueueResponse extends IQueueResponse {
    countSessions: number;
}
