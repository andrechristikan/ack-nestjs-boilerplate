import { Injectable } from '@nestjs/common';
import type {
    IAuthJwtAccessTokenPayload,
    IAuthJwtRefreshTokenPayload,
} from '@modules/auth/interfaces/auth.interface';
import { HelperStringService } from '@common/helper/services/helper.string.service';
import {
    AuthGoogleCertificateErrorPrefix,
    AuthJwksErrorName,
    AuthProviderNetworkErrorCodes,
} from '@modules/auth/constants/auth.constant';
import { AuthProviderUnavailableException } from '@modules/auth/exceptions/auth.provider-unavailable.exception';
import {
    EnumUserLoginFrom,
    EnumUserLoginWith,
} from '@generated/prisma-client/client';
import type { User } from '@generated/prisma-client/client';

/** Auth utility: shapes the JWT payloads and the jti. See docs/authentication.md. */
@Injectable()
export class AuthUtil {
    constructor(private readonly helperStringService: HelperStringService) {}

    /** Assembles the access token payload from the user and login context. */
    createPayloadAccessToken(
        data: User,
        sessionId: string,
        deviceOwnershipId: string,
        loginAt: Date,
        loginFrom: EnumUserLoginFrom,
        loginWith: EnumUserLoginWith
    ): IAuthJwtAccessTokenPayload {
        return {
            userId: data.id,
            roleId: data.roleId,
            username: data.username,
            email: data.email,
            sessionId,
            deviceOwnershipId,
            loginAt,
            loginFrom,
            loginWith,
        };
    }

    /** Derives the minimal refresh token payload from an access token payload. */
    createPayloadRefreshToken({
        sessionId,
        userId,
        deviceOwnershipId,
        loginFrom,
        loginAt,
        loginWith,
    }: IAuthJwtAccessTokenPayload): IAuthJwtRefreshTokenPayload {
        return {
            loginAt,
            loginFrom,
            loginWith,
            sessionId,
            deviceOwnershipId,
            userId,
        };
    }

    /** Generates a random 32-character jti used to bind a token to its session. */
    generateJti(): string {
        return this.helperStringService.random(32);
    }

    /**
     * Maps an unreachable key or identity provider to its exception, returning `null` for every other error.
     * `jwks-rsa` flags a failed fetch with `isEndpointUnavailable` (4.x) or names it `JwksError`; `google-auth-library` prefixes its certificate fetch failure; a raw Node network error carries a `code`.
     * A `SigningKeyNotFoundError`, a `JwksRateLimitError`, and a token verification error name a bad token, not an outage.
     */
    toProviderUnavailableException(
        error: unknown
    ): AuthProviderUnavailableException | null {
        if (!(error instanceof Error)) {
            return null;
        }

        const isFlagged =
            'isEndpointUnavailable' in error &&
            error.isEndpointUnavailable === true;
        const isJwksError = error.name === AuthJwksErrorName;
        const isGoogleCertificateError = error.message.startsWith(
            AuthGoogleCertificateErrorPrefix
        );
        const isNetworkError =
            'code' in error &&
            typeof error.code === 'string' &&
            AuthProviderNetworkErrorCodes.includes(error.code);
        if (
            isFlagged ||
            isJwksError ||
            isGoogleCertificateError ||
            isNetworkError
        ) {
            return new AuthProviderUnavailableException(error);
        }

        return null;
    }
}
