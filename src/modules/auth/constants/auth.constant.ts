import { HttpStatus } from '@nestjs/common';
import type { IDocResponseEntry } from '@common/doc/interfaces/doc.interface';
import { EnumAuthStatusCodeError } from '@modules/auth/enums/auth.status-code.enum';
import { EnumSessionStatusCodeError } from '@modules/session/enums/session.status-code.enum';

/**
 * Passport strategy name of the JWT access-token guard.
 * @public
 */
export const AuthJwtAccessGuardKey = 'AuthJwtAccessGuardKey';

/**
 * Passport strategy name of the JWT refresh-token guard.
 * @public
 */
export const AuthJwtRefreshGuardKey = 'AuthJwtRefreshGuardKey';

/**
 * OpenAPI Bearer scheme name for JWT access-token routes.
 * @public
 */
export const AuthJwtAccessDocSecurityName = 'accessToken';

/**
 * OpenAPI Bearer scheme name for JWT refresh-token routes.
 * @public
 */
export const AuthJwtRefreshDocSecurityName = 'refreshToken';

/**
 * OpenAPI Bearer scheme name for Google social-auth routes.
 * @public
 */
export const AuthSocialGoogleDocSecurityName = 'google';

/**
 * OpenAPI Bearer scheme name for Apple social-auth routes.
 * @public
 */
export const AuthSocialAppleDocSecurityName = 'apple';

/**
 * Request-store key holding the verified JWT payload.
 * @public
 */
export const AuthPayloadStoreKey = 'AuthPayloadStoreKey';

/**
 * HKDF purpose that seals stored two-factor secrets.
 * @public
 */
export const AuthTwoFactorSecretEncryptionPurpose = 'auth.twoFactor.secret';

/**
 * Node network error codes that mark an unreachable key or identity provider endpoint.
 * @public
 */
export const AuthProviderNetworkErrorCodes: readonly string[] = [
    'ECONNREFUSED',
    'ECONNRESET',
    'ENOTFOUND',
    'ETIMEDOUT',
    'EAI_AGAIN',
    'EHOSTUNREACH',
    'ENETUNREACH',
];

/**
 * Error name `jwks-rsa` gives a JWKS endpoint that answers an HTTP error or no usable key.
 * @public
 */
export const AuthJwksErrorName = 'JwksError';

/**
 * Message prefix `google-auth-library` puts on a failed certificate fetch.
 * @public
 */
export const AuthGoogleCertificateErrorPrefix =
    'Failed to retrieve verification certificates';

/**
 * Request header carrying the JWT or social ID token.
 * @public
 */
export const AuthHeaderName = 'Authorization';

/**
 * Scheme preceding the token in `AuthHeaderName`, and the `tokenType` a login response reports.
 * @public
 */
export const AuthBearerScheme = 'Bearer';

/**
 * Error entries `@AuthJwtAccessProtected` documents: the invalid access token, the revoked session, and the unavailable key provider.
 * @public
 */
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

/**
 * Error entries `@AuthJwtRefreshProtected` documents: the invalid refresh token and the unavailable key provider.
 * @public
 */
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

/**
 * Error entries `@AuthSocialGoogleProtected` documents: the invalid and missing Google token, the provider not configured, and the unavailable provider.
 * @public
 */
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

/**
 * Error entries `@AuthSocialAppleProtected` documents: the invalid and missing Apple token, the provider not configured, and the unavailable provider.
 * @public
 */
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
