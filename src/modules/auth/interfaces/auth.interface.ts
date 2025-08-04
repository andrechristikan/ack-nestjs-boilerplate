import { ENUM_AUTH_LOGIN_FROM } from '@modules/auth/enums/auth.enum';
import { ENUM_POLICY_ROLE_TYPE } from '@modules/policy/enums/policy.enum';

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
    loginDate: Date;
    loginFrom: ENUM_AUTH_LOGIN_FROM;
    email: string;
    username: string;
    userId: string;
    sessionId: string;
    roleId: string;
    type: ENUM_POLICY_ROLE_TYPE;
    termPolicy: IAuthJwtTermPolicyPayload;
    verification: IAuthJwtVerificationPayload;
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
