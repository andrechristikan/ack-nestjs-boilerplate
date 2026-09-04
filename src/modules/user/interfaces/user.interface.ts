import {
    Country,
    Device,
    DeviceOwnership,
    EnumActivityLogAction,
    EnumPasswordHistoryType,
    EnumProjectMemberRole,
    EnumTermPolicyType,
    EnumUserLoginFrom,
    EnumUserLoginWith,
    EnumUserSignUpFrom,
    EnumUserSignUpWith,
    EnumVerificationType,
    EnumWorkspaceMemberRole,
    Prisma,
    Role,
    TwoFactor,
    User,
    UserMobileNumber,
    UserPhoto,
} from '@generated/prisma-client';
import { IAuthPassword } from '@modules/auth/interfaces/auth.interface';
import { EnumUserSignUpWorkspaceContextType } from '@modules/user/enums/user.enum';

export interface IUser extends User {
    role: Role;
    twoFactor: TwoFactor | null;
}

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
    slug: string;
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
