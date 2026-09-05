import { AuthJwtAccessTokenInvalidException } from '@modules/auth/exceptions/auth.jwt-access-token-invalid.exception';
import { AuthJwtRefreshTokenInvalidException } from '@modules/auth/exceptions/auth.jwt-refresh-token-invalid.exception';
import { AuthSocialAppleInvalidException } from '@modules/auth/exceptions/auth.social-apple-invalid.exception';
import { AuthSocialGoogleInvalidException } from '@modules/auth/exceptions/auth.social-google-invalid.exception';
import {
    IAuthJwtAccessTokenPayload,
    IAuthJwtRefreshTokenPayload,
    IAuthSocialPayload,
} from '@modules/auth/interfaces/auth.interface';
import { IAuthService } from '@modules/auth/interfaces/auth.service.interface';
import { AuthSocialService } from '@modules/auth/services/auth.social.service';
import { SessionForbiddenException } from '@modules/session/exceptions/session.forbidden.exception';
import { SessionCacheService } from '@modules/session/services/session.cache.service';
import { Injectable } from '@nestjs/common';
import { TokenPayload } from 'google-auth-library';

@Injectable()
export class AuthService implements IAuthService {
    constructor(
        private readonly authSocialService: AuthSocialService,
        private readonly sessionCacheService: SessionCacheService
    ) {}

    async validateJwtAccessStrategy(
        payload: IAuthJwtAccessTokenPayload
    ): Promise<IAuthJwtAccessTokenPayload> {
        const { sub, sessionId, jti } = payload;

        if (
            !sub ||
            !sessionId ||
            typeof sub !== 'string' ||
            !jti ||
            typeof jti !== 'string'
        ) {
            throw new AuthJwtAccessTokenInvalidException();
        }

        const isValidSession = await this.sessionCacheService.getLogin(
            sub,
            sessionId
        );
        if (!isValidSession || jti !== isValidSession.jti) {
            throw new SessionForbiddenException();
        }

        return payload;
    }

    validateJwtAccessGuard(
        err: Error,
        user: IAuthJwtAccessTokenPayload,
        info: Error
    ): IAuthJwtAccessTokenPayload {
        if (err || !user) {
            throw new AuthJwtAccessTokenInvalidException(err ? err : info);
        }

        return user;
    }

    async validateJwtRefreshStrategy(
        payload: IAuthJwtRefreshTokenPayload
    ): Promise<IAuthJwtRefreshTokenPayload> {
        const { sub, sessionId, jti } = payload;
        if (
            !sub ||
            !sessionId ||
            typeof sub !== 'string' ||
            !jti ||
            typeof jti !== 'string'
        ) {
            throw new AuthJwtRefreshTokenInvalidException();
        }

        const isValidSession = await this.sessionCacheService.getLogin(
            sub,
            sessionId
        );
        if (!isValidSession || jti !== isValidSession.jti) {
            throw new SessionForbiddenException();
        }

        return payload;
    }

    validateJwtRefreshGuard(
        err: Error,
        user: IAuthJwtRefreshTokenPayload,
        info: Error
    ): IAuthJwtRefreshTokenPayload {
        if (err || !user) {
            throw new AuthJwtRefreshTokenInvalidException(err ? err : info);
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
            throw new AuthSocialAppleInvalidException(err);
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
            throw new AuthSocialGoogleInvalidException(err);
        }
    }
}
