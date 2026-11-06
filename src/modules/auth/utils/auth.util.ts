import { Injectable } from '@nestjs/common';
import { AppBaseException } from '@app/exceptions/app.base.exception';
import { AppUnknownException } from '@app/exceptions/app.unknown.exception';
import { DatabaseUtil } from '@common/database/utils/database.util';
import type {
    IAuthJwtAccessTokenPayload,
    IAuthJwtPayloadIdentified,
    IAuthJwtRefreshTokenPayload,
    IAuthLoginIdentifiers,
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
} from '@modules/auth/constants/auth.constant';
import { AuthProviderUnavailableException } from '@modules/auth/exceptions/auth.provider-unavailable.exception';
import {
    EnumUserLoginFrom,
    EnumUserLoginWith,
} from '@generated/prisma-client/client';
import type { User } from '@generated/prisma-client/client';
import type { IUser } from '@modules/user/interfaces/user.interface';

@Injectable()
export class AuthUtil {
    constructor(
        private readonly helperStringService: HelperStringService,
        private readonly helperHashService: HelperHashService,
        private readonly helperDateService: HelperDateService,
        private readonly databaseUtil: DatabaseUtil
    ) {}

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
        return this.helperStringService.random(32);
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

    /** Whole seconds left until `exp` (epoch seconds), negative once passed; a null `exp` counts as the epoch. */
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

    /** Maps a failed Passport JWT result to the exception the guard throws: a typed strategy exception as is, any other strategy error wrapped, a provider outage in `info`, otherwise the fallback. */
    toJwtGuardException(
        err: Error | null,
        info: Error,
        fallback: AppBaseException
    ): AppBaseException {
        if (err instanceof AppBaseException) {
            return err;
        }

        if (err) {
            return new AppUnknownException(
                err,
                'Validating the JWT session failed'
            );
        }

        const unavailable = this.toProviderUnavailableException(info);

        return unavailable ?? fallback;
    }
}
