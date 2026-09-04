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
import { AuthUtil } from '@modules/auth/utils/auth.util';
import { SessionForbiddenException } from '@modules/session/exceptions/session.forbidden.exception';
import { SessionUtil } from '@modules/session/utils/session.util';
import { Injectable } from '@nestjs/common';
import { TokenPayload } from 'google-auth-library';

@Injectable()
export class AuthService implements IAuthService {
    constructor(
        private readonly authUtil: AuthUtil,
        private readonly sessionUtil: SessionUtil
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

        const isValidSession = await this.sessionUtil.getLogin(sub, sessionId);
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

        const isValidSession = await this.sessionUtil.getLogin(sub, sessionId);
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
            const payload = await this.authUtil.verifyApple(idToken);

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
                await this.authUtil.verifyGoogle(idToken);

            return {
                email: payload.email ?? '',
                emailVerified: payload.email_verified ?? false,
            };
        } catch (err: unknown) {
            throw new AuthSocialGoogleInvalidException(err);
        }
    }
}
