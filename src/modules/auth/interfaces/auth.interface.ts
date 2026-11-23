import {
    EnumUserLoginFrom,
    EnumUserLoginWith,
} from '@generated/prisma-client/client';

export interface IAuthToken {
    tokenType: string;
    roleKey: string;
    expiresIn: number;
    accessToken: string;
    refreshToken: string;
}

export interface IAuthPassword {
    passwordHash: string;
    passwordExpired: Date | null;
    passwordCreated: Date;
    passwordPeriodExpired: Date;
}

export interface IAuthPasswordTemporary extends IAuthPassword {
    passwordExpired: Date;
}

export interface IAuthPasswordOptions {
    temporary: true;
}

export interface IAuthJwtAccessTokenPayload {
    loginAt: Date;
    loginFrom: EnumUserLoginFrom;
    loginWith: EnumUserLoginWith;
    email: string;
    username: string;
    userId: string;
    sessionId: string;
    deviceOwnershipId: string;
    roleId: string;

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
    'type' | 'roleId' | 'username' | 'email' | 'verification'
>;

export type IAuthJwtPayloadIdentified<
    T extends { sub?: string; jti?: string },
> = T & { sub: string; jti: string };

export interface IAuthJwtAccessContext {
    userId: string;
    sessionId: string;
    deviceOwnershipId: string;
    loginWith: EnumUserLoginWith;
}

export interface IAuthJwtRefreshContext extends IAuthJwtAccessContext {
    token: string;
}

export interface IAuthSocialContext {
    email: string;
    emailVerified: boolean;
    subject: string;
}

export interface IAuthSocialNonce {
    nonce: string;
    expiredAt: Date;
}

export interface IAuthAccessTokenGenerate {
    tokens: IAuthToken;
    jti: string;
    sessionId: string;
}

export interface IAuthLoginIdentifiers {
    sessionId: string;
    jti: string;
}

export interface IAuthTokenSignInput extends IAuthLoginIdentifiers {
    deviceOwnershipId: string;
    loginAt: Date;
}
