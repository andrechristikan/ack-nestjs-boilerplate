import { AppBaseException } from '@app/exceptions/app.base.exception';
import { AppUnknownException } from '@app/exceptions/app.unknown.exception';
import { HelperHashService } from '@common/helper/services/helper.hash.service';
import {
    AuthGoogleCertificateErrorPrefix,
    AuthJwksErrorName,
    AuthProviderNetworkErrorCodes,
} from '@modules/auth/constants/auth.constant';
import { AuthJwtAccessTokenInvalidException } from '@modules/auth/exceptions/auth.jwt-access-token-invalid.exception';
import { AuthJwtRefreshTokenInvalidException } from '@modules/auth/exceptions/auth.jwt-refresh-token-invalid.exception';
import { AuthSocialAppleNotConfiguredException } from '@modules/auth/exceptions/auth.social-apple-not-configured.exception';
import { AuthSocialAppleInvalidException } from '@modules/auth/exceptions/auth.social-apple-invalid.exception';
import { AuthSocialGoogleNotConfiguredException } from '@modules/auth/exceptions/auth.social-google-not-configured.exception';
import { AuthSocialGoogleInvalidException } from '@modules/auth/exceptions/auth.social-google-invalid.exception';
import { AuthProviderUnavailableException } from '@modules/auth/exceptions/auth.provider-unavailable.exception';
import type {
    IAuthJwtAccessTokenPayload,
    IAuthJwtPayloadIdentified,
    IAuthJwtRefreshTokenPayload,
    IAuthSocialContext,
} from '@modules/auth/interfaces/auth.interface';
import { AuthSocialService } from '@modules/auth/services/auth.social.service';
import { SessionRevokedException } from '@modules/session/exceptions/session.revoked.exception';
import { Injectable } from '@nestjs/common';
import type { TokenPayload } from 'google-auth-library';

@Injectable()
export class AuthService {
    constructor(
        private readonly authSocialService: AuthSocialService,
        private readonly helperHashService: HelperHashService
    ) {}

    private isTokenPayloadValid<
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

    private isJtiMatch(sessionJtiDigest: string, jti: string): boolean {
        const jtiHash = this.helperHashService.sha256Hash(jti);

        return this.helperHashService.sha256Compare(sessionJtiDigest, jtiHash);
    }

    private toProviderUnavailableException(
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

    private assertJwtGuardError(err: Error | null, info: Error | null): void {
        if (err instanceof AppBaseException) {
            throw err;
        }

        if (err) {
            throw new AppUnknownException(
                err,
                'Validating the JWT session failed'
            );
        }

        const unavailable = this.toProviderUnavailableException(info);
        if (unavailable instanceof AppBaseException) {
            throw unavailable;
        }
    }

    validateJwtAccessStrategy(
        payload: IAuthJwtAccessTokenPayload
    ): IAuthJwtPayloadIdentified<IAuthJwtAccessTokenPayload> {
        const isValid = this.isTokenPayloadValid(payload);
        if (!isValid) {
            throw new AuthJwtAccessTokenInvalidException();
        }

        return payload;
    }

    /** Throws the session-revoked exception when the session digest is null (no login stored) or the token jti does not hash to it. */
    validateJwtAccessSession(
        payload: IAuthJwtPayloadIdentified<IAuthJwtAccessTokenPayload>,
        sessionJtiDigest: string | null
    ): IAuthJwtAccessTokenPayload {
        if (sessionJtiDigest === null) {
            throw new SessionRevokedException();
        }

        const isMatch = this.isJtiMatch(sessionJtiDigest, payload.jti);
        if (!isMatch) {
            throw new SessionRevokedException();
        }

        return payload;
    }

    validateJwtAccessGuard(
        err: Error | null,
        user: IAuthJwtAccessTokenPayload | null,
        info: Error | null
    ): IAuthJwtAccessTokenPayload {
        if (err || !user) {
            this.assertJwtGuardError(err, info);

            throw new AuthJwtAccessTokenInvalidException(info);
        }

        return user;
    }

    async validateJwtRefreshStrategy(
        payload: IAuthJwtRefreshTokenPayload
    ): Promise<IAuthJwtRefreshTokenPayload> {
        const isValid = this.isTokenPayloadValid(payload);
        if (!isValid) {
            throw new AuthJwtRefreshTokenInvalidException();
        }

        return payload;
    }

    validateJwtRefreshGuard(
        err: Error | null,
        user: IAuthJwtRefreshTokenPayload | null,
        info: Error | null
    ): IAuthJwtRefreshTokenPayload {
        if (err || !user) {
            this.assertJwtGuardError(err, info);

            throw new AuthJwtRefreshTokenInvalidException(info);
        }

        return user;
    }

    async validateOAuthApple(idToken: string): Promise<IAuthSocialContext> {
        try {
            const payload = await this.authSocialService.verifyApple(idToken);

            return {
                email: payload.email,
                emailVerified: payload.email_verified,
            };
        } catch (err: unknown) {
            if (
                err instanceof AuthSocialAppleNotConfiguredException ||
                err instanceof AuthSocialAppleInvalidException
            ) {
                throw err;
            }

            const unavailable = this.toProviderUnavailableException(err);

            throw unavailable ?? new AuthSocialAppleInvalidException(err);
        }
    }

    async validateOAuthGoogle(idToken: string): Promise<IAuthSocialContext> {
        try {
            const payload: TokenPayload =
                await this.authSocialService.verifyGoogle(idToken);

            return {
                email: payload.email ?? '',
                emailVerified: payload.email_verified ?? false,
            };
        } catch (err: unknown) {
            if (
                err instanceof AuthSocialGoogleNotConfiguredException ||
                err instanceof AuthSocialGoogleInvalidException
            ) {
                throw err;
            }

            const unavailable = this.toProviderUnavailableException(err);

            throw unavailable ?? new AuthSocialGoogleInvalidException(err);
        }
    }
}
