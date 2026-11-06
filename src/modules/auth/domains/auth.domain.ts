import { AppBaseException } from '@app/exceptions/app.base.exception';
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
import { AuthSocialDomain } from '@modules/auth/domains/auth.social.domain';
import { AuthUtil } from '@modules/auth/utils/auth.util';
import { SessionRevokedException } from '@modules/session/exceptions/session.revoked.exception';
import { Injectable } from '@nestjs/common';
import type { TokenPayload } from 'google-auth-library';

@Injectable()
export class AuthDomain {
    constructor(
        private readonly authSocialDomain: AuthSocialDomain,
        private readonly authUtil: AuthUtil
    ) {}

    /** Rejects an access token payload missing its `sub`, `sessionId`, or `jti`. */
    validateJwtAccessStrategy(
        payload: IAuthJwtAccessTokenPayload
    ): IAuthJwtPayloadIdentified<IAuthJwtAccessTokenPayload> {
        const isValid = this.authUtil.isTokenPayloadValid(payload);
        if (!isValid) {
            throw new AuthJwtAccessTokenInvalidException();
        }

        return payload;
    }

    /** Rejects a token whose session has no stored jti digest (no login) or whose jti does not hash to the digest stored for the session. */
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
        err: Error,
        user: IAuthJwtAccessTokenPayload,
        info: Error
    ): IAuthJwtAccessTokenPayload {
        if (err || !user) {
            const exception = this.authUtil.toJwtGuardException(
                err,
                info,
                new AuthJwtAccessTokenInvalidException(info)
            );
            if (exception instanceof AppBaseException) {
                throw exception;
            }
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
        err: Error,
        user: IAuthJwtRefreshTokenPayload,
        info: Error
    ): IAuthJwtRefreshTokenPayload {
        if (err || !user) {
            const exception = this.authUtil.toJwtGuardException(
                err,
                info,
                new AuthJwtRefreshTokenInvalidException(info)
            );
            if (exception instanceof AppBaseException) {
                throw exception;
            }
        }

        return user;
    }

    async validateOAuthApple(idToken: string): Promise<IAuthSocialPayload> {
        try {
            const payload = await this.authSocialDomain.verifyApple(idToken);

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
                await this.authSocialDomain.verifyGoogle(idToken);

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
}
