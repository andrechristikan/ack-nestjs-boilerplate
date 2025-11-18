import { IRequestApp } from '@common/request/interfaces/request.interface';
import { AuthTokenResponseDto } from '@modules/auth/dtos/response/auth.token.response.dto';
import {
    IAuthJwtAccessTokenPayload,
    IAuthJwtRefreshTokenPayload,
    IAuthSocialPayload,
} from '@modules/auth/interfaces/auth.interface';
import { IUser } from '@modules/user/interfaces/user.interface';
import { ENUM_USER_LOGIN_FROM, ENUM_USER_SIGN_UP_WITH } from '@prisma/client';

export interface IAuthService {
    createTokens(
        user: IUser,
        sessionId: string,
        loginFrom: ENUM_USER_LOGIN_FROM,
        loginWith: ENUM_USER_SIGN_UP_WITH
    ): AuthTokenResponseDto;
    refreshToken(
        user: IUser,
        refreshTokenFromRequest: string
    ): AuthTokenResponseDto;
    validateJwtAccessGuard(
        err: Error,
        user: IAuthJwtAccessTokenPayload,
        info: Error
    ): Promise<IAuthJwtAccessTokenPayload>;
    validateJwtRefreshGuard(
        err: Error,
        user: IAuthJwtRefreshTokenPayload,
        info: Error
    ): Promise<IAuthJwtRefreshTokenPayload>;
    validateOAuthAppleGuard(
        request: IRequestApp<IAuthSocialPayload>
    ): Promise<boolean>;
    validateOAuthGoogleGuard(
        request: IRequestApp<IAuthSocialPayload>
    ): Promise<boolean>;
}
