import { Injectable } from '@nestjs/common';
import type {
    IAuthJwtAccessTokenPayload,
    IAuthJwtPayloadIdentified,
    IAuthJwtRefreshTokenPayload,
} from '@modules/auth/interfaces/auth.interface';
import { HelperDateService } from '@common/helper/services/helper.date.service';
import { HelperHashService } from '@common/helper/services/helper.hash.service';
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
    constructor(
        private readonly helperStringService: HelperStringService,
        private readonly helperHashService: HelperHashService,
        private readonly helperDateService: HelperDateService
    ) {}

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

    /** True when the payload carries string `sub` and `jti` claims and a `sessionId`. */
    isTokenPayloadValid<
        T extends { sub?: string; jti?: string; sessionId: string },
    >(payload: T): payload is IAuthJwtPayloadIdentified<T> {
        const { sub, sessionId, jti } = payload;

        return (
            !!sub &&
            !!sessionId &&
            typeof sub === 'string' &&
            !!jti &&
            typeof jti === 'string'
        );
    }

    /** Compares the session's stored jti digest with the SHA-256 hash of the token jti. */
    isJtiMatch(sessionJtiDigest: string, jti: string): boolean {
        const jtiHash = this.helperHashService.sha256Hash(jti);

        return this.helperHashService.sha256Compare(sessionJtiDigest, jtiHash);
    }

    /** Whole seconds left until the token's `exp` (epoch seconds); a missing `exp` counts as the epoch. */
    remainingSeconds(exp: number | null): number {
        const today = this.helperDateService.create();
        const expiredAt = this.helperDateService.createFromTimestamp(
            (exp ?? 0) * 1000
        );
        const remaining = this.helperDateService.diff(expiredAt, today);

        return remaining.seconds
            ? remaining.seconds
            : Math.floor(remaining.milliseconds / 1000);
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
