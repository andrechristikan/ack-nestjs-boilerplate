import { AuthTokenResponseDto } from '@modules/auth/dtos/response/auth.token.response.dto';
import { ENUM_AUTH_LOGIN_FROM } from '@modules/auth/enums/auth.enum';
import {
    IAuthJwtAccessTokenPayload,
    IAuthJwtRefreshTokenPayload,
    IAuthPassword,
    IAuthPasswordOptions,
    IAuthSocialPayload,
} from '@modules/auth/interfaces/auth.interface';

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
        data: any, // TODO: CHANGE WITH USER DOC INTERFACE
        sessionId: string,
        loginDate: Date,
        loginFrom: ENUM_AUTH_LOGIN_FROM
    ): IAuthJwtAccessTokenPayload;
    createPayloadRefreshToken({
        sessionId,
        userId,
        loginFrom,
        loginDate,
    }: IAuthJwtAccessTokenPayload): IAuthJwtRefreshTokenPayload;
    validatePassword(passwordString: string, passwordHash: string): boolean;
    checkPasswordAttempt(
        user: any // TODO: CHANGE WITH USER DOC INTERFACE
    ): boolean;
    createPassword(
        password: string,
        options?: IAuthPasswordOptions
    ): IAuthPassword;
    createPasswordRandom(): string;
    checkPasswordExpired(passwordExpired: Date): boolean;
    createTokens(
        user: any, // TODO: CHANGE WITH USER DOC INTERFACE
        sessionId: string
    ): AuthTokenResponseDto;
    refreshToken(
        user: any, // TODO: CHANGE WITH USER DOC INTERFACE
        refreshTokenFromRequest: string
    ): AuthTokenResponseDto;
    appleGetTokenInfo(token: string): Promise<IAuthSocialPayload>;
    googleGetTokenInfo(idToken: string): Promise<IAuthSocialPayload>;
}
