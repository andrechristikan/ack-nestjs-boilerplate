import {
    ENUM_ROLE_TYPE,
    ENUM_USER_LOGIN_FROM,
    ENUM_USER_SIGN_UP_WITH,
} from '@prisma/client';

export interface IAuthPassword {
    salt: string;
    passwordHash: string;
    passwordExpired: Date;
    passwordCreated: Date;
}

export interface IAuthPasswordOptions {
    temporary: boolean;
}

export interface IAuthJwtTermPolicyPayload {
    term: boolean;
    privacy: boolean;
    marketing: boolean;
    cookies: boolean;
}

export interface IAuthJwtVerificationPayload {
    email: boolean;
    mobileNumber: boolean;
}

export interface IAuthJwtAccessTokenPayload {
    loginAt: Date;
    loginFrom: ENUM_USER_LOGIN_FROM;
    loginWith: ENUM_USER_SIGN_UP_WITH;
    email: string;
    username: string;
    userId: string;
    sessionId: string;
    roleId: string;
    type: ENUM_ROLE_TYPE;
    iat?: number;
    nbf?: number;
    exp?: number;
    aud?: string;
    iss?: string;
    sub?: string;
}

export type IAuthJwtRefreshTokenPayload = Omit<
    IAuthJwtAccessTokenPayload,
    'type' | 'roleId' | 'username' | 'email' | 'termPolicy' | 'verification'
>;

export interface IAuthSocialPayload
    extends Pick<IAuthJwtAccessTokenPayload, 'email'> {
    emailVerified: boolean;
}
