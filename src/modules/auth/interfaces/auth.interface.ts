import { AuthTokenResponseDto } from '@modules/auth/dtos/response/auth.token.response.dto';
import {
    EnumUserLoginFrom,
    EnumUserLoginWith,
    EnumUserSignUpWith,
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

export interface IAuthJwtAccessTokenPayload {
    loginAt: Date;
    loginFrom: EnumUserLoginFrom;
    loginWith: EnumUserSignUpWith;
    email: string;
    username: string;
    userId: string;
    sessionId: string;
    roleId: string;

    // standard JWT claims
    jti?: string;
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

export interface IAuthSocialPayload extends Pick<
    IAuthJwtAccessTokenPayload,
    'email'
> {
    emailVerified: boolean;
}

export interface IAuthTokenGenerate {
    tokens: AuthTokenResponseDto;
    jti: string;
    sessionId: string;
}

export interface IAuthTwoFactorChallengeCache {
    userId: string;
    loginFrom: EnumUserLoginFrom;
    loginWith: EnumUserLoginWith;
}

export interface IAuthTwoFactorBackupCodes {
    codes: string[];
    hashes: string[];
}
