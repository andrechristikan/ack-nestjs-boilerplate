import { EnumFileExtensionImage } from '@common/file/enums/file.enum';
import {
    Country,
    Device,
    DeviceOwnership,
    EnumActivityLogAction,
    EnumPasswordHistoryType,
    EnumProjectMemberRole,
    EnumTermPolicyType,
    EnumUserGender,
    EnumUserLoginFrom,
    EnumUserLoginWith,
    EnumUserSignUpFrom,
    EnumUserSignUpWith,
    EnumVerificationType,
    EnumWorkspaceMemberRole,
    Prisma,
    TwoFactor,
    User,
    UserMobileNumber,
    UserPhoto,
} from '@generated/prisma-client';
import {
    IAuthPassword,
    IAuthToken,
    IAuthTwoFactorVerify,
} from '@modules/auth/interfaces/auth.interface';
import { IDeviceIdentity } from '@modules/device/interfaces/device.interface';
import { IRoleWithPolicies } from '@modules/role/interfaces/role.interface';
import { EnumUserSignUpWorkspaceContextType } from '@modules/user/enums/user.enum';

export interface IUser extends User {
    role: IRoleWithPolicies;
    twoFactor: TwoFactor | null;
}

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
}

export interface IUserLogin {
    loginFrom: EnumUserLoginFrom;
    loginWith: EnumUserLoginWith;
    expiredAt: Date;
    jti: string;
    sessionId: string;
}

export interface IUserLoginResult {
    user: User;
    device: Device;
    deviceOwnership: DeviceOwnership;
    isNewDevice: boolean;
    sessionShouldBeInactive?: { id: string }[];
}

export interface IUserForgotPasswordCreate {
    expiredAt: Date;
    expiredInMinutes: number;
    resendInMinutes: number;
    reference: string;
    token: string;
    hashedToken: string;
    link: string;
    encryptedLink: string;
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
    encryptedLink: string;
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
    workspaceMemberRole: EnumWorkspaceMemberRole;
    projectId?: string;
    projectMemberRole?: EnumProjectMemberRole;
}

export type IUserSignUpWorkspaceContext =
    IUserSignUpWorkspacePersonal | IUserSignUpWorkspaceInvite;

export interface IUserOnboardingWorkspaceRows {
    workspace: Prisma.WorkspaceCreateArgs | null;
    workspaceMember: Prisma.WorkspaceMemberCreateArgs;
    workspaceInvite: Prisma.WorkspaceInviteUpdateArgs | null;
    projectMember: Prisma.ProjectMemberCreateArgs | null;
}

export interface IUserOnboardingVerificationRow {
    reference: string;
    token: string;
    type: EnumVerificationType;
    to: string;
    expiredAt: Date;
    verifiedAt: Date | null;
    isUsed: boolean;
}

export interface IUserCreateModeRule {
    createdAction: EnumActivityLogAction;
    logsVerificationEmailRequest: boolean;
    passwordHistoryType: EnumPasswordHistoryType | null;
}

export interface IUserCreateWithWorkspaceInput {
    userId: string;
    email: string;
    name?: string;
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
    verification: IUserOnboardingVerificationRow | null;
    activityLogs: Prisma.ActivityLogCreateManyUserInput[];
    workspaceContext: IUserSignUpWorkspaceContext;
    workspaceRows: IUserOnboardingWorkspaceRows;
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

export interface IUserImportRow {
    username: string;
    email: string;
    name?: string;
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
    photoKey: string;
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
    workspaceInviteToken?: string;
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
    workspaceInviteToken?: string;
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
