import { AuthTokenResponseDto } from '@modules/auth/dtos/response/auth.token.response.dto';
import {
    IAuthJwtAccessTokenPayload,
    IAuthJwtRefreshTokenPayload,
    IAuthPassword,
    IAuthPasswordOptions,
    IAuthSocialPayload,
} from '@modules/auth/interfaces/auth.interface';
import { IUser } from '@modules/user/interfaces/user.interface';
import {
    ENUM_USER_LOGIN_FROM,
    ENUM_USER_SIGN_UP_WITH,
    User,
} from '@prisma/client';

export interface IAuthService {
    createAccessToken(
        subject: string,
        payload: IAuthJwtAccessTokenPayload
    ): string;
    createRefreshToken(
        subject: string,
        payload: IAuthJwtRefreshTokenPayload
    ): string;
    validateAccessToken(subject: string, token: string): boolean;
    validateRefreshToken(subject: string, token: string): boolean;
    payloadToken<T>(token: string): T;
    createPayloadAccessToken(
        data: IUser,
        sessionId: string,
        loginAt: Date,
        loginFrom: ENUM_USER_LOGIN_FROM,
        loginWith: ENUM_USER_SIGN_UP_WITH
    ): IAuthJwtAccessTokenPayload;
    createPayloadRefreshToken({
        sessionId,
        userId,
        loginFrom,
        loginAt,
        loginWith,
    }: IAuthJwtAccessTokenPayload): IAuthJwtRefreshTokenPayload;
    validatePassword(passwordString: string, passwordHash: string): boolean;
    checkPasswordAttempt(data: User): boolean;
    createPassword(
        password: string,
        options?: IAuthPasswordOptions
    ): IAuthPassword;
    createPasswordRandom(): string;
    checkPasswordExpired(passwordExpired: Date): boolean;
    createTokens(
        data: IUser,
        sessionId: string,
        loginFrom: ENUM_USER_LOGIN_FROM,
        loginWith: ENUM_USER_SIGN_UP_WITH
    ): AuthTokenResponseDto;
    refreshToken(
        data: IUser,
        refreshTokenFromRequest: string
    ): AuthTokenResponseDto;
    appleGetTokenInfo(token: string): Promise<IAuthSocialPayload>;
    googleGetTokenInfo(idToken: string): Promise<IAuthSocialPayload>;
}
