import { IRequestApp } from '@common/request/interfaces/request.interface';
import { AuthJwtAccessTokenInvalidException } from '@modules/auth/exceptions/auth.jwt-access-token-invalid.exception';
import { AuthJwtRefreshTokenInvalidException } from '@modules/auth/exceptions/auth.jwt-refresh-token-invalid.exception';
import { AuthSocialAppleInvalidException } from '@modules/auth/exceptions/auth.social-apple-invalid.exception';
import { AuthSocialAppleRequiredException } from '@modules/auth/exceptions/auth.social-apple-required.exception';
import { AuthSocialGoogleInvalidException } from '@modules/auth/exceptions/auth.social-google-invalid.exception';
import { AuthSocialGoogleRequiredException } from '@modules/auth/exceptions/auth.social-google-required.exception';
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

    async validateOAuthAppleGuard(
        request: IRequestApp<IAuthSocialPayload>
    ): Promise<boolean> {
        const requestHeaders = this.authUtil.extractHeaderApple(request);
        if (requestHeaders.length !== 2) {
            throw new AuthSocialAppleRequiredException();
        }

        try {
            const payload = await this.authUtil.verifyApple(requestHeaders[1]);

            request.user = {
                email: payload.email,
                emailVerified: payload.email_verified,
            };

            return true;
        } catch (err: unknown) {
            throw new AuthSocialAppleInvalidException(err);
        }
    }

    async validateOAuthGoogleGuard(
        request: IRequestApp<IAuthSocialPayload>
    ): Promise<boolean> {
        const requestHeaders = this.authUtil.extractHeaderGoogle(request);

        if (requestHeaders.length !== 2) {
            throw new AuthSocialGoogleRequiredException();
        }

        try {
            const payload: TokenPayload = await this.authUtil.verifyGoogle(
                requestHeaders[1]
            );

            request.user = {
                email: payload.email ?? '',
                emailVerified: payload.email_verified ?? false,
            };

            return true;
        } catch (err: unknown) {
            throw new AuthSocialGoogleInvalidException(err);
        }
    }
}
