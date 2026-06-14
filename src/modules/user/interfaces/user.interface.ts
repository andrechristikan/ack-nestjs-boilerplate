import {
    Country,
    Device,
    DeviceOwnership,
    EnumUserLoginFrom,
    EnumUserLoginWith,
    Role,
    TwoFactor,
    User,
    UserMobileNumber,
} from '@generated/prisma-client';

export interface IUser extends User {
    role: Role;
    twoFactor: TwoFactor | null;
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
    | IUserVerificationEmailCreate
    | IUserVerificationMobileNumberCreate;
