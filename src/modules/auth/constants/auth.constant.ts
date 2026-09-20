import { HttpStatus } from '@nestjs/common';
import { DocResponseError } from '@common/doc/decorators/doc.decorator';
import { EnumAuthStatusCodeError } from '@modules/auth/enums/auth.status-code.enum';
import { EnumSessionStatusCodeError } from '@modules/session/enums/session.status-code.enum';

/**
 * Passport strategy name of the JWT access-token guard.
 * @public
 */
export const AuthJwtAccessGuardKey = 'JwtAccess';

/**
 * Passport strategy name of the JWT refresh-token guard.
 * @public
 */
export const AuthJwtRefreshGuardKey = 'JwtRefresh';

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
export const AuthPayloadStoreKey = 'AuthPayloadStore';

/**
 * HKDF purpose that seals stored two-factor secrets.
 * @public
 */
export const AuthTwoFactorSecretEncryptionPurpose = 'auth.twoFactor.secret';

/**
 * JWT access-token guard error kit for `@AuthJwtAccessProtected`.
 * @public
 */
export const DocAuthJwtAccessErrorResponses = {
    unauthorized: DocResponseError(
        HttpStatus.UNAUTHORIZED,
        {
            messagePath: 'auth.error.accessTokenUnauthorized',
            statusCode: EnumAuthStatusCodeError.jwtAccessTokenInvalid,
        },
        {
            messagePath: 'session.error.forbidden',
            statusCode: EnumSessionStatusCodeError.forbidden,
        }
    ),
} as const;

/**
 * JWT refresh-token guard error kit for `@AuthJwtRefreshProtected`.
 * @public
 */
export const DocAuthJwtRefreshErrorResponses = {
    unauthorized: DocResponseError(
        HttpStatus.UNAUTHORIZED,
        {
            messagePath: 'auth.error.refreshTokenUnauthorized',
            statusCode: EnumAuthStatusCodeError.jwtRefreshTokenInvalid,
        },
        {
            messagePath: 'session.error.forbidden',
            statusCode: EnumSessionStatusCodeError.forbidden,
        }
    ),
} as const;

/**
 * Google social auth guard error kit for `@AuthSocialGoogleProtected`.
 * @public
 */
export const DocAuthSocialGoogleErrorResponses = {
    unauthorized: DocResponseError(
        HttpStatus.UNAUTHORIZED,
        {
            messagePath: 'auth.error.socialGoogleInvalid',
            statusCode: EnumAuthStatusCodeError.socialGoogleInvalid,
        },
        {
            messagePath: 'auth.error.socialGoogleRequired',
            statusCode: EnumAuthStatusCodeError.socialGoogleRequired,
        }
    ),
} as const;

/**
 * Apple social auth guard error kit for `@AuthSocialAppleProtected`.
 * @public
 */
export const DocAuthSocialAppleErrorResponses = {
    unauthorized: DocResponseError(
        HttpStatus.UNAUTHORIZED,
        {
            messagePath: 'auth.error.socialAppleInvalid',
            statusCode: EnumAuthStatusCodeError.socialAppleInvalid,
        },
        {
            messagePath: 'auth.error.socialAppleRequired',
            statusCode: EnumAuthStatusCodeError.socialAppleRequired,
        }
    ),
} as const;
