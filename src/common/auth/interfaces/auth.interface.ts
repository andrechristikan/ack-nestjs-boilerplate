import { ENUM_AUTH_LOGIN_FROM } from 'src/common/auth/constants/auth.enum.constant';

// Auth
export interface IAuthPassword {
    salt: string;
    passwordHash: string;
    passwordExpired: Date;
    passwordCreated: Date;
}

export interface IAuthPayloadOptions {
    loginFrom: ENUM_AUTH_LOGIN_FROM;
    loginDate: Date;
}
