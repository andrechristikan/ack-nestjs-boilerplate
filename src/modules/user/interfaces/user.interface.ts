import {
    Country,
    Device,
    DeviceOwnership,
    EnumProjectMemberRole,
    EnumUserLoginFrom,
    EnumUserLoginWith,
    EnumWorkspaceMemberRole,
    Role,
    TwoFactor,
    User,
    UserMobileNumber,
    UserPhoto,
} from '@generated/prisma-client';
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
