import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { DatabaseUtil } from '@common/database/utils/database.util';
import type {
    IAuthJwtAccessTokenPayload,
    IAuthJwtPayloadIdentified,
    IAuthJwtRefreshTokenPayload,
    IAuthLoginIdentifiers,
    IAuthSocialGithubEmail,
    IAuthSocialGithubToken,
    IAuthToken,
} from '@modules/auth/interfaces/auth.interface';
import { HelperDateService } from '@common/helper/services/helper.date.service';
import { HelperHashService } from '@common/helper/services/helper.hash.service';
import { HelperStringService } from '@common/helper/services/helper.string.service';
import {
    AuthBearerScheme,
    AuthGoogleCertificateErrorPrefix,
    AuthJwksErrorName,
    AuthProviderNetworkErrorCodes,
    AuthSocialGithubClientErrorCodes,
    AuthSocialGithubRateLimitRemainingHeaderName,
    AuthSocialGithubRetryAfterHeaderName,
} from '@modules/auth/constants/auth.constant';
import { AuthProviderUnavailableException } from '@modules/auth/exceptions/auth.provider-unavailable.exception';
import { AuthSocialGithubInvalidException } from '@modules/auth/exceptions/auth.social-github-invalid.exception';
import { AppUnknownException } from '@app/exceptions/app.unknown.exception';
import {
    EnumUserLoginFrom,
    EnumUserLoginWith,
} from '@generated/prisma-client/client';
import type { User } from '@generated/prisma-client/client';
import type { IUser } from '@modules/user/interfaces/user.interface';

@Injectable()
export class AuthUtil {
    private readonly jtiLength: number;

    constructor(
        private readonly helperStringService: HelperStringService,
        private readonly helperHashService: HelperHashService,
        private readonly helperDateService: HelperDateService,
        private readonly databaseUtil: DatabaseUtil,
        private readonly configService: ConfigService
    ) {
        this.jtiLength = this.configService.get<number>('auth.jwt.jtiLength')!;
    }

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

    toToken(
        user: IUser,
        accessToken: string,
        refreshToken: string,
        expiresIn: number
    ): IAuthToken {
        return {
            tokenType: AuthBearerScheme,
            roleType: user.role.type,
            expiresIn,
            accessToken,
            refreshToken,
        };
    }

    generateJti(): string {
        return this.helperStringService.random(this.jtiLength);
    }

    createLoginIdentifiers(): IAuthLoginIdentifiers {
        const sessionId = this.databaseUtil.createId();
        const jti = this.generateJti();

        return { sessionId, jti };
    }

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

    isJtiMatch(sessionJtiDigest: string, jti: string): boolean {
        const jtiHash = this.helperHashService.sha256Hash(jti);

        return this.helperHashService.sha256Compare(sessionJtiDigest, jtiHash);
    }

    /** Whole seconds left until `exp` (epoch seconds), negative once passed; a null `exp` leaves no remaining seconds. */
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

    /** Maps an unreachable key or identity provider to its exception; null for every other error, a bad token included. */
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

    /** Maps a GitHub 5xx, or a 403 or 429 carrying a rate-limit signal, to its exception; null for every other status. */
    toGithubUnavailableException(
        status: number,
        headers: Headers
    ): AuthProviderUnavailableException | null {
        const isRateLimited =
            (status === 403 || status === 429) &&
            (headers.has(AuthSocialGithubRetryAfterHeaderName) ||
                headers.get(AuthSocialGithubRateLimitRemainingHeaderName) ===
                    '0');
        if (status >= 500 || isRateLimited) {
            return new AuthProviderUnavailableException({ status });
        }

        return null;
    }

    /** Maps a GitHub token-exchange error code: a client fault is the invalid exception, any other code is an unknown exception. */
    toGithubTokenException(
        error: string,
        description: string | null
    ): AuthSocialGithubInvalidException | AppUnknownException {
        if (AuthSocialGithubClientErrorCodes.includes(error)) {
            return new AuthSocialGithubInvalidException({
                error,
                description,
            });
        }

        return new AppUnknownException(
            { error, description },
            'GitHub rejected the OAuth app credentials or request'
        );
    }

    /** Maps a GitHub emails response status; null for a 2xx. */
    toGithubEmailsException(
        status: number
    ): AuthSocialGithubInvalidException | AppUnknownException | null {
        if (status >= 200 && status < 300) {
            return null;
        }
        if (status === 401 || status === 403 || status === 404) {
            return new AuthSocialGithubInvalidException({ status });
        }

        return new AppUnknownException(
            { status },
            'GitHub rejected the emails request'
        );
    }

    parseGithubToken(
        text: string
    ): IAuthSocialGithubToken | AppUnknownException {
        try {
            return JSON.parse(text) as IAuthSocialGithubToken;
        } catch (err) {
            return new AppUnknownException(
                err,
                'GitHub token response is not JSON'
            );
        }
    }

    parseGithubEmails(
        text: string
    ): IAuthSocialGithubEmail[] | AppUnknownException {
        try {
            return JSON.parse(text) as IAuthSocialGithubEmail[];
        } catch (err) {
            return new AppUnknownException(
                err,
                'GitHub emails response is not JSON'
            );
        }
    }
}
