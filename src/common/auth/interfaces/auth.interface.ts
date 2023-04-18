import { ENUM_AUTH_LOGIN_WITH } from 'src/common/auth/constants/auth.enum.constant';

// Auth
export interface IAuthPassword {
    salt: string;
    passwordHash: string;
    passwordExpired: Date;
    passwordCreated: Date;
}

export interface IAuthPayloadOptions {
    loginWith: ENUM_AUTH_LOGIN_WITH;
}

export interface IAuthRefreshTokenOptions {
    // in milis
    notBeforeExpirationTime?: number | string;
}

export interface IAuthGooglePayload {
    email: string;
    firstName: string;
    lastName: string;
    accessToken: string;
    refreshToken: string;
}
