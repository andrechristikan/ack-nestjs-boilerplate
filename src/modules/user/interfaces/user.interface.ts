import {
    Country,
    EnumUserLoginFrom,
    EnumUserLoginWith,
    EnumVerificationType,
    Role,
    User,
    UserMobileNumber,
} from '@prisma/client';

export interface IUser extends User {
    role: Role;
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
    fingerprint: string;
    sessionId: string;
}

export interface IUserForgotPasswordCreate {
    expiredAt: Date;
    expiredInMinutes: number;
    resendInMinutes: number;
    reference: string;
    token: string;
    link: string;
}

export interface IUserVerificationCreate {
    type: EnumVerificationType;
    expiredAt: Date;
    expiredInMinutes: number;
    resendInMinutes: number;
    reference: string;
    token: string;
    link?: string;
}
