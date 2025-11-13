import {
    Country,
    ENUM_USER_LOGIN_FROM,
    ENUM_USER_LOGIN_WITH,
    ENUM_VERIFICATION_TYPE,
    Role,
    User,
    UserMobileNumber,
} from '@prisma/client';

export interface IUser extends User {
    role: Role;
}

export interface IUserProfile extends IUser {
    mobileNumbers: UserMobileNumber[];
    country: Country;
}

export interface IUserLogin {
    loginFrom: ENUM_USER_LOGIN_FROM;
    loginWith: ENUM_USER_LOGIN_WITH;
    expiredAt: Date;
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
    type: ENUM_VERIFICATION_TYPE;
    expiredAt: Date;
    expiredInMinutes: number;
    resendInMinutes: number;
    reference: string;
    token: string;
    link?: string;
}
