import { IRequestApp } from '@common/request/interfaces/request.interface';
import { EnumAuthStatusCodeError } from '@modules/auth/enums/auth.status-code.enum';
import {
    IAuthJwtAccessTokenPayload,
    IAuthJwtRefreshTokenPayload,
    IAuthSocialPayload,
} from '@modules/auth/interfaces/auth.interface';
import { IAuthService } from '@modules/auth/interfaces/auth.service.interface';
import { AuthUtil } from '@modules/auth/utils/auth.util';
import { EnumSessionStatusCodeError } from '@modules/session/enums/session.status-code.enum';
import { SessionUtil } from '@modules/session/utils/session.util';
import { Injectable, UnauthorizedException } from '@nestjs/common';
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
            throw new UnauthorizedException({
                statusCode: EnumAuthStatusCodeError.jwtAccessTokenInvalid,
                message: 'auth.error.accessTokenUnauthorized',
            });
        }

        const isValidSession = await this.sessionUtil.getLogin(sub, sessionId);
        if (!isValidSession || jti !== isValidSession.jti) {
            throw new UnauthorizedException({
                statusCode: EnumSessionStatusCodeError.forbidden,
                message: 'session.error.forbidden',
            });
        }

        return payload;
    }

    validateJwtAccessGuard(
        err: Error,
        user: IAuthJwtAccessTokenPayload,
        info: Error
    ): IAuthJwtAccessTokenPayload {
        if (err || !user) {
            throw new UnauthorizedException({
                statusCode: EnumAuthStatusCodeError.jwtAccessTokenInvalid,
                message: 'auth.error.accessTokenUnauthorized',
                _error: err ? err : info,
            });
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
            throw new UnauthorizedException({
                statusCode: EnumAuthStatusCodeError.jwtRefreshTokenInvalid,
                message: 'auth.error.refreshTokenUnauthorized',
            });
        }

        const isValidSession = await this.sessionUtil.getLogin(sub, sessionId);
        if (!isValidSession || jti !== isValidSession.jti) {
            throw new UnauthorizedException({
                statusCode: EnumSessionStatusCodeError.forbidden,
                message: 'session.error.forbidden',
            });
        }

        return payload;
    }

    validateJwtRefreshGuard(
        err: Error,
        user: IAuthJwtRefreshTokenPayload,
        info: Error
    ): IAuthJwtRefreshTokenPayload {
        if (err || !user) {
            throw new UnauthorizedException({
                statusCode: EnumAuthStatusCodeError.jwtRefreshTokenInvalid,
                message: 'auth.error.refreshTokenUnauthorized',
                _error: err ? err : info,
            });
        }

        return user;
    }

    async validateOAuthAppleGuard(
        request: IRequestApp<IAuthSocialPayload>
    ): Promise<boolean> {
        const requestHeaders = this.authUtil.extractHeaderApple(request);
        if (requestHeaders.length !== 2) {
            throw new UnauthorizedException({
                statusCode: EnumAuthStatusCodeError.socialGoogleRequired,
                message: 'auth.error.socialAppleRequired',
            });
        }

        try {
            const payload = await this.authUtil.verifyApple(requestHeaders[1]);

            request.user = {
                email: payload.email,
                emailVerified: payload.email_verified,
            };

            return true;
        } catch (err: unknown) {
            throw new UnauthorizedException({
                statusCode: EnumAuthStatusCodeError.socialGoogleInvalid,
                message: 'auth.error.socialAppleInvalid',
                _error: err,
            });
        }
    }

    async validateOAuthGoogleGuard(
        request: IRequestApp<IAuthSocialPayload>
    ): Promise<boolean> {
        const requestHeaders = this.authUtil.extractHeaderGoogle(request);

        if (requestHeaders.length !== 2) {
            throw new UnauthorizedException({
                statusCode: EnumAuthStatusCodeError.socialGoogleRequired,
                message: 'auth.error.socialGoogleRequired',
            });
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
            throw new UnauthorizedException({
                statusCode: EnumAuthStatusCodeError.socialGoogleInvalid,
                message: 'auth.error.socialGoogleInvalid',
                _error: err,
            });
        }
    }
}
