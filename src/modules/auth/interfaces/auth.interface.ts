import { EnumAuthTwoFactorMethod } from '@modules/auth/enums/auth.enum';
import { DeviceRequestDto } from '@modules/device/dtos/request/device.request.dto';
import {
    EnumRoleType,
    EnumUserLoginFrom,
    EnumUserLoginWith,
} from '@generated/prisma-client';

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
    passwordEncrypted: string;
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
    'type' | 'roleId' | 'username' | 'email' | 'termPolicy' | 'verification'
>;

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

export interface IAuthRefreshTokenGenerate extends IAuthAccessTokenGenerate {
    expiredInMs: number;
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
    device: DeviceRequestDto;
    loginFrom: EnumUserLoginFrom;
    loginWith: EnumUserLoginWith;
}

export interface IAuthTwoFactorVerify {
    method?: EnumAuthTwoFactorMethod;
    code?: string;
    backupCode?: string;
}

export interface IAuthTwoFactorVerifyResult {
    isValid: boolean;
    method: EnumAuthTwoFactorMethod;
    usedBackupCodeHash?: string;
}

export interface IAuthTwoFactorSetup {
    secret: string;
    otpauthUrl: string;
    encryptedSecret: string;
    iv: string;
}
