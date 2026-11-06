import type { IDeviceIdentity } from '@modules/device/interfaces/device.interface';
import {
    EnumRoleType,
    EnumUserLoginFrom,
    EnumUserLoginWith,
} from '@generated/prisma-client/client';

export interface IAuthToken {
    tokenType: string;
    roleType: EnumRoleType;
    expiresIn: number;
    accessToken: string;
    refreshToken: string;
}

export interface IAuthPassword {
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

export interface IAuthSocialPayload extends Pick<
    IAuthJwtAccessTokenPayload,
    'email'
> {
    emailVerified: boolean;
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

export interface IAuthTwoFactorBackupCodes {
    codes: string[];
    hashes: string[];
}

export interface IAuthTwoFactorBackupCodesVerifyResult {
    isValid: boolean;
    index: number;
}

export interface IAuthTwoFactorChallenge {
    challengeToken: string;
    expiresInMs: number;
}

export interface IAuthTwoFactorChallengeCache {
    userId: string;
    device: IDeviceIdentity;
    loginFrom: EnumUserLoginFrom;
    loginWith: EnumUserLoginWith;
}

export type IAuthJwtPayloadField<T> = Extract<keyof T, string>;

export type IAuthJwtAccessTokenPayloadUser = Pick<
    IAuthJwtAccessTokenPayload,
    'userId' | 'loginWith'
>;
