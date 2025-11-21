import { AuthTokenResponseDto } from '@modules/auth/dtos/response/auth.token.response.dto';
import { ENUM_USER_LOGIN_FROM, ENUM_USER_SIGN_UP_WITH } from '@prisma/client';

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

export interface IAuthJwtAccessTokenPayload {
    loginAt: Date;
    loginFrom: ENUM_USER_LOGIN_FROM;
    loginWith: ENUM_USER_SIGN_UP_WITH;
    email: string;
    username: string;
    userId: string;
    sessionId: string;
    roleId: string;
    fingerprint: string;

    // standard JWT claims
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

export interface IAuthTokenGenerate {
    tokens: AuthTokenResponseDto;
    fingerprint: string;
    sessionId: string;
}
