import { HttpStatus } from '@nestjs/common';
import type { IDocResponseEntry } from '@common/doc/interfaces/doc.interface';
import { EnumAuthStatusCodeError } from '@modules/auth/enums/auth.status-code.enum';
import { EnumSessionStatusCodeError } from '@modules/session/enums/session.status-code.enum';

/** @public */
export const AuthJwtAccessGuardKey = 'AuthJwtAccessGuardKey';

/** @public */
export const AuthJwtRefreshGuardKey = 'AuthJwtRefreshGuardKey';

/** @public */
export const AuthJwtAccessDocSecurityName = 'accessToken';

/** @public */
export const AuthJwtRefreshDocSecurityName = 'refreshToken';

/** @public */
export const AuthSocialGoogleDocSecurityName = 'google';

/** @public */
export const AuthSocialAppleDocSecurityName = 'apple';

/** @public */
export const AuthPayloadStoreKey = 'AuthPayloadStoreKey';

/** @public */
export const AuthTwoFactorSecretEncryptionPurpose = 'auth.twoFactor.secret';

/** @public */
export const AuthProviderNetworkErrorCodes: readonly string[] = [
    'ECONNREFUSED',
    'ECONNRESET',
    'ENOTFOUND',
    'ETIMEDOUT',
    'EAI_AGAIN',
    'EHOSTUNREACH',
    'ENETUNREACH',
];

/** @public */
export const AuthJwksErrorName = 'JwksError';

/** @public */
export const AuthGoogleCertificateErrorPrefix =
    'Failed to retrieve verification certificates';

/** @public */
export const AuthHeaderName = 'Authorization';

/** @public */
export const AuthBearerScheme = 'Bearer';

/** @public */
export const AuthJwtAccessProtectedDocErrors: IDocResponseEntry[] = [
    {
        httpStatus: HttpStatus.UNAUTHORIZED,
        statusCode: EnumAuthStatusCodeError.jwtAccessTokenInvalid,
        messagePath: 'auth.error.accessTokenUnauthorized',
    },
    {
        httpStatus: HttpStatus.UNAUTHORIZED,
        statusCode: EnumSessionStatusCodeError.revoked,
        messagePath: 'session.error.revoked',
    },
    {
        httpStatus: HttpStatus.SERVICE_UNAVAILABLE,
        statusCode: EnumAuthStatusCodeError.providerUnavailable,
        messagePath: 'auth.error.providerUnavailable',
    },
];

/** @public */
export const AuthJwtRefreshProtectedDocErrors: IDocResponseEntry[] = [
    {
        httpStatus: HttpStatus.UNAUTHORIZED,
        statusCode: EnumAuthStatusCodeError.jwtRefreshTokenInvalid,
        messagePath: 'auth.error.refreshTokenUnauthorized',
    },
    {
        httpStatus: HttpStatus.SERVICE_UNAVAILABLE,
        statusCode: EnumAuthStatusCodeError.providerUnavailable,
        messagePath: 'auth.error.providerUnavailable',
    },
];

/** @public */
export const AuthSocialGoogleProtectedDocErrors: IDocResponseEntry[] = [
    {
        httpStatus: HttpStatus.UNAUTHORIZED,
        statusCode: EnumAuthStatusCodeError.socialGoogleInvalid,
        messagePath: 'auth.error.socialGoogleInvalid',
    },
    {
        httpStatus: HttpStatus.UNAUTHORIZED,
        statusCode: EnumAuthStatusCodeError.socialGoogleRequired,
        messagePath: 'auth.error.socialGoogleRequired',
    },
    {
        httpStatus: HttpStatus.NOT_FOUND,
        statusCode: EnumAuthStatusCodeError.socialGoogleNotConfigured,
        messagePath: 'auth.error.socialGoogleNotConfigured',
    },
    {
        httpStatus: HttpStatus.SERVICE_UNAVAILABLE,
        statusCode: EnumAuthStatusCodeError.providerUnavailable,
        messagePath: 'auth.error.providerUnavailable',
    },
];

/** @public */
export const AuthSocialAppleProtectedDocErrors: IDocResponseEntry[] = [
    {
        httpStatus: HttpStatus.UNAUTHORIZED,
        statusCode: EnumAuthStatusCodeError.socialAppleInvalid,
        messagePath: 'auth.error.socialAppleInvalid',
    },
    {
        httpStatus: HttpStatus.UNAUTHORIZED,
        statusCode: EnumAuthStatusCodeError.socialAppleRequired,
        messagePath: 'auth.error.socialAppleRequired',
    },
    {
        httpStatus: HttpStatus.NOT_FOUND,
        statusCode: EnumAuthStatusCodeError.socialAppleNotConfigured,
        messagePath: 'auth.error.socialAppleNotConfigured',
    },
    {
        httpStatus: HttpStatus.SERVICE_UNAVAILABLE,
        statusCode: EnumAuthStatusCodeError.providerUnavailable,
        messagePath: 'auth.error.providerUnavailable',
    },
];
