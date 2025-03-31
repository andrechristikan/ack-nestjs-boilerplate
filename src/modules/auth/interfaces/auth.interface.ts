import { ENUM_AUTH_LOGIN_FROM } from 'src/modules/auth/enums/auth.enum';
import { ENUM_POLICY_ROLE_TYPE } from 'src/modules/policy/enums/policy.enum';

export interface IAuthPassword {
    salt: string;
    passwordHash: string;
    passwordExpired: Date;
    passwordCreated: Date;
}

export interface IAuthPasswordOptions {
    temporary: boolean;
}

export interface IAuthJwtAccessTokenPayload {
    loginDate: Date;
    loginFrom: ENUM_AUTH_LOGIN_FROM;
    user: string;
    email: string;
    session: string;
    role: string;
    type: ENUM_POLICY_ROLE_TYPE;
    iat?: number;
    nbf?: number;
    exp?: number;
    aud?: string;
    iss?: string;
    sub?: string;
}

export type IAuthJwtRefreshTokenPayload = Omit<
    IAuthJwtAccessTokenPayload,
    'role' | 'type' | 'email'
>;

export interface IAuthSocialGooglePayload
    extends Pick<IAuthJwtAccessTokenPayload, 'email'> {
    name: string;
    photo: string;
    emailVerified: boolean;
}

export type IAuthSocialApplePayload = Pick<
    IAuthSocialGooglePayload,
    'email' | 'emailVerified'
>;
