import { AppBaseException } from '@app/exceptions/app.base.exception';
import { AppUnknownException } from '@app/exceptions/app.unknown.exception';
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
import type { VerifyAppleIdTokenResponse } from 'verify-apple-id-token';

@Injectable()
export class AuthService {
    constructor(private readonly authSocialService: AuthSocialService) {}

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
            AuthProviderNetworkErrorCodes.has(error.code);
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

    private async verifyApplePayload(
        idToken: string
    ): Promise<VerifyAppleIdTokenResponse> {
        try {
            const payload = await this.authSocialService.verifyApple(idToken);
            if (!payload.sub) {
                throw new AuthSocialAppleInvalidException(
                    'Apple token payload does not contain sub'
                );
            }

            return payload;
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

    private async verifyGooglePayload(idToken: string): Promise<TokenPayload> {
        try {
            const payload = await this.authSocialService.verifyGoogle(idToken);
            if (!payload.sub) {
                throw new AuthSocialGoogleInvalidException(
                    'Google token payload does not contain sub'
                );
            }

            return payload;
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

    validateJwtAccessStrategy(
        payload: IAuthJwtAccessTokenPayload
    ): IAuthJwtPayloadIdentified<IAuthJwtAccessTokenPayload> {
        const isValid = this.isTokenPayloadValid(payload);
        if (!isValid) {
            throw new AuthJwtAccessTokenInvalidException();
        }

        return payload;
    }

    validateJwtAccessSession(
        payload: IAuthJwtPayloadIdentified<IAuthJwtAccessTokenPayload>,
        isActive: boolean
    ): IAuthJwtAccessTokenPayload {
        if (!isActive) {
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
        const payload = await this.verifyApplePayload(idToken);

        await this.authSocialService.consumeNonce(payload.nonce ?? null);

        return {
            email: payload.email,
            emailVerified: payload.email_verified,
            subject: payload.sub,
        };
    }

    async validateOAuthGoogle(idToken: string): Promise<IAuthSocialContext> {
        const payload = await this.verifyGooglePayload(idToken);

        await this.authSocialService.consumeNonce(payload.nonce ?? null);

        return {
            email: payload.email ?? '',
            emailVerified: payload.email_verified ?? false,
            subject: payload.sub,
        };
    }
}
