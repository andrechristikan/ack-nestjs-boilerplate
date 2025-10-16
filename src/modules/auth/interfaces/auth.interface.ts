import {
    ENUM_TERM_POLICY_TYPE,
    ENUM_USER_LOGIN_FROM,
    ENUM_USER_SIGN_UP_WITH,
} from '@prisma/client';

export interface IAuthPassword {
    salt: string;
    passwordHash: string;
    passwordExpired: Date;
    passwordCreated: Date;
    passwordPeriodExpired: Date;
}

export interface IAuthPasswordOptions {
    temporary: boolean;
}

export interface IAuthJwtTermPolicyPayload {
    [ENUM_TERM_POLICY_TYPE.COOKIE]: boolean;
    [ENUM_TERM_POLICY_TYPE.PRIVACY]: boolean;
    [ENUM_TERM_POLICY_TYPE.MARKETING]: boolean;
    [ENUM_TERM_POLICY_TYPE.TERMS_OF_SERVICE]: boolean;
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
