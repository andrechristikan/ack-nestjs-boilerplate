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
    EnumVerificationType,
    EnumWorkspaceMemberRole,
} from '@generated/prisma-client/client';
import type { IActivityLogMetadata } from '@modules/activity-log/interfaces/activity-log.interface';
import type {
    Country,
    Prisma,
    Role,
    TwoFactor,
    TwoFactorBackupCode,
    User,
    UserMobileNumber,
    UserPhoto,
} from '@generated/prisma-client/client';
import type {
    UserAdminListSelect,
    UserAdminNearLockoutSelect,
} from '@modules/user/constants/user.constant';
import type {
    IAuthPassword,
    IAuthToken,
    IAuthTwoFactorVerify,
} from '@modules/auth/interfaces/auth.interface';
import type { IDeviceIdentity } from '@modules/device/interfaces/device.interface';
import type { IRoleWithPolicies } from '@modules/role/interfaces/role.interface';
import { EnumUserSignUpWorkspaceContextType } from '@modules/user/enums/user.enum';

export interface IUserTwoFactor extends TwoFactor {
    backupCodes: TwoFactorBackupCode[];
}

export interface IUser extends User {
    role: IRoleWithPolicies;
    twoFactor: IUserTwoFactor | null;
}

/** A user row flattened for CSV export: only the role name and the photo are joined. */
export interface IUserExport extends User {
    role: Pick<Role, 'name'>;
    photo: UserPhoto | null;
}

export type IUserList = Prisma.UserGetPayload<{
    select: typeof UserAdminListSelect;
}>;

export type IUserNearLockout = Prisma.UserGetPayload<{
    select: typeof UserAdminNearLockoutSelect;
}>;

export type IUserContact = Pick<User, 'id' | 'email' | 'username'>;

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
    photo: UserPhoto | null;
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
    invitedByUserId: string | null;
    workspaceMemberRole: EnumWorkspaceMemberRole;
    projectId: string | null;
    projectMemberRole: EnumProjectMemberRole | null;
}

export type IUserSignUpWorkspaceContext =
    IUserSignUpWorkspacePersonal | IUserSignUpWorkspaceInvite;

export interface IUserOnboardingActivity {
    action: EnumActivityLogAction;
    userId: string;
    workspaceId: string | null;
    createdBy: string;
    metadata: IActivityLogMetadata;
}

export interface IUserOnboardingVerification {
    reference: string;
    token: string;
    type: EnumVerificationType;
    to: string;
    expiredAt: Date;
    verifiedAt: Date | null;
    isUsed: boolean;
}

export interface IUserCreateContract {
    createdAction: EnumActivityLogAction;
    logsVerificationEmailRequest: boolean;
    passwordHistoryType: EnumPasswordHistoryType | null;
    personalWorkspaceAction: EnumActivityLogAction;
    logsActingAdmin: boolean;
}

export type IUserTermPolicyColumn =
    | 'termsOfServiceAccepted'
    | 'privacyAccepted'
    | 'cookiesAccepted'
    | 'marketingAccepted';

export interface IUserTermPolicyContract {
    defaults: Record<EnumTermPolicyType, boolean>;
    columns: Record<EnumTermPolicyType, IUserTermPolicyColumn>;
    requiredTypes: EnumTermPolicyType[];
}

export type IUserOnboardingAdminAction =
    | typeof EnumActivityLogAction.adminUserCreate
    | typeof EnumActivityLogAction.adminUserImport;

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
    termPolicy: Record<EnumTermPolicyType, boolean>;
    acceptedTermPolicyTypes: EnumTermPolicyType[];
    password: IAuthPassword | null;
    passwordHistoryType: EnumPasswordHistoryType | null;
    verification: IUserOnboardingVerification | null;
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

export interface IUserCreateByAdmin {
    username: string;
    email: string;
    name?: string;
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
    name?: string;
}

export interface IUserImportPrepared {
    inputs: IUserCreateWithWorkspaceInput[];
    passwordHasheds: IAuthPassword[];
    passwordStrings: string[];
}

export interface IUserUpdateProfile {
    name?: string;
    countryId: string;
    gender: EnumUserGender;
}

export interface IUserGeneratePhotoProfile {
    extension: EnumFileExtensionImage;
    size: number;
}

export interface IUserUpdatePhotoProfile {
    key: string;
    size: number;
}

export interface IUserMobileNumberInput {
    number: string;
    phoneCode: string;
    countryId: string;
}

export interface IUserLoginCredential {
    email: string;
    password: string;
    from: EnumUserLoginFrom;
    device: IDeviceIdentity;
}

export interface IUserLoginSocial {
    username: string;
    name?: string;
    countryId: string;
    from: EnumUserLoginFrom;
    device: IDeviceIdentity;
    cookies: boolean;
    marketing: boolean;
    inviteToken?: string;
}

export interface IUserSignUp {
    username: string;
    email: string;
    name?: string;
    countryId: string;
    password: string;
    from: EnumUserSignUpFrom;
    cookies: boolean;
    marketing: boolean;
    inviteToken?: string;
}

export interface IUserChangePassword extends IAuthTwoFactorVerify {
    newPassword: string;
    oldPassword: string;
}

export interface IUserResetPassword extends IAuthTwoFactorVerify {
    newPassword: string;
    token: string;
}

export interface IUserTwoFactorStatus {
    isEnabled: boolean;
    isPendingConfirmation: boolean;
    backupCodesRemaining: number;
    confirmedAt: Date | null;
    lastUsedAt: Date | null;
}

export interface IUserTwoFactorSetup {
    secret: string;
    otpauthUrl: string;
}

export interface IUserLoginTwoFactorChallenge {
    isRequiredSetup: boolean;
    challengeToken: string;
    challengeExpiresInMs: number;
    backupCodesRemaining: number;
    otpauthUrl?: string;
    secret?: string;
}

export interface IUserLoginOutcome {
    isTwoFactorEnable: boolean;
    lastWorkspaceId: string | null;
    lastWorkspaceChangedAt: Date | null;
    tokens?: IAuthToken;
    twoFactor?: IUserLoginTwoFactorChallenge;
}

export interface IUserAnalyticGroupCount<T extends string = string> {
    key: T;
    count: number;
}

export interface IUserAnalyticSignUp {
    id: string;
    email: string;
    signUpAt: Date;
    signUpFrom: EnumUserSignUpFrom;
}

export interface IUserAnalyticRef {
    id: string;
    email: string;
    passwordAttempt: number | null;
}

export interface IUserForgotPasswordAnalytic {
    id: string;
    userId: string;
    isUsed: boolean;
    createdAt: Date;
    to: string;
}

export interface IUserForgotPasswordAnalyticUserCount {
    userId: string;
    count: number;
}

export interface IUserVerificationAnalyticUsedBucket {
    isUsed: boolean;
    count: number;
}
