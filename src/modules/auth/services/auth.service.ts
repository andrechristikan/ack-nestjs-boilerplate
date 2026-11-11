import { AppBaseException } from '@app/exceptions/app.base.exception';
import { AppUnknownException } from '@app/exceptions/app.unknown.exception';
import { AuthJwtAccessTokenInvalidException } from '@modules/auth/exceptions/auth.jwt-access-token-invalid.exception';
import { AuthJwtRefreshTokenInvalidException } from '@modules/auth/exceptions/auth.jwt-refresh-token-invalid.exception';
import { AuthSocialAppleNotConfiguredException } from '@modules/auth/exceptions/auth.social-apple-not-configured.exception';
import { AuthSocialAppleInvalidException } from '@modules/auth/exceptions/auth.social-apple-invalid.exception';
import { AuthSocialGoogleNotConfiguredException } from '@modules/auth/exceptions/auth.social-google-not-configured.exception';
import { AuthSocialGoogleInvalidException } from '@modules/auth/exceptions/auth.social-google-invalid.exception';
import type {
    IAuthJwtAccessTokenPayload,
    IAuthJwtPayloadIdentified,
    IAuthJwtRefreshTokenPayload,
    IAuthSocialPayload,
} from '@modules/auth/interfaces/auth.interface';
import { AuthSocialService } from '@modules/auth/services/auth.social.service';
import { AuthUtil } from '@modules/auth/utils/auth.util';
import { SessionRevokedException } from '@modules/session/exceptions/session.revoked.exception';
import { Injectable } from '@nestjs/common';
import type { TokenPayload } from 'google-auth-library';

@Injectable()
export class AuthService {
    constructor(
        private readonly authSocialService: AuthSocialService,
        private readonly authUtil: AuthUtil
    ) {}

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

        const unavailable = this.authUtil.toProviderUnavailableException(info);
        if (unavailable instanceof AppBaseException) {
            throw unavailable;
        }
    }

    validateJwtAccessStrategy(
        payload: IAuthJwtAccessTokenPayload
    ): IAuthJwtPayloadIdentified<IAuthJwtAccessTokenPayload> {
        const isValid = this.authUtil.isTokenPayloadValid(payload);
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

        const isMatch = this.authUtil.isJtiMatch(sessionJtiDigest, payload.jti);
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
        const isValid = this.authUtil.isTokenPayloadValid(payload);
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

    async validateOAuthApple(idToken: string): Promise<IAuthSocialPayload> {
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

            const unavailable =
                this.authUtil.toProviderUnavailableException(err);

            throw unavailable ?? new AuthSocialAppleInvalidException(err);
        }
    }

    async validateOAuthGoogle(idToken: string): Promise<IAuthSocialPayload> {
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

            const unavailable =
                this.authUtil.toProviderUnavailableException(err);

            throw unavailable ?? new AuthSocialGoogleInvalidException(err);
        }
    }

    async validateOAuthGithub(
        code: string,
        redirectUri: string,
        codeVerifier: string
    ): Promise<IAuthSocialPayload> {
        try {
            const email = await this.authSocialService.verifyGithub(
                code,
                redirectUri,
                codeVerifier
            );

            return { email, emailVerified: true };
        } catch (err: unknown) {
            if (err instanceof AppBaseException) {
                throw err;
            }

            throw new AppUnknownException(err);
        }
    }
}
