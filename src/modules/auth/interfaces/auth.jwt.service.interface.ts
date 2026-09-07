import {
    IAuthAccessTokenGenerate,
    IAuthJwtAccessTokenPayload,
    IAuthJwtRefreshTokenPayload,
    IAuthRefreshTokenGenerate,
} from '@modules/auth/interfaces/auth.interface';
import { EnumUserLoginFrom, EnumUserLoginWith } from '@generated/prisma-client';
import { IUser } from '@modules/user/interfaces/user.interface';

export interface IAuthJwtService {
    readonly jwtRefreshTokenExpirationTimeInMs: number;
    createAccessToken(
        subject: string,
        jti: string,
        payload: IAuthJwtAccessTokenPayload
    ): string;
    createRefreshToken(
        subject: string,
        jti: string,
        payload: IAuthJwtRefreshTokenPayload,
        expiresIn?: number
    ): string;
    validateAccessToken(subject: string, jti: string, token: string): boolean;
    validateRefreshToken(subject: string, jti: string, token: string): boolean;
    payloadToken<T>(token: string): T;
    createTokens(
        user: IUser,
        loginFrom: EnumUserLoginFrom,
        loginWith: EnumUserLoginWith
    ): IAuthAccessTokenGenerate;
    refreshToken(
        user: IUser,
        refreshTokenFromRequest: string
    ): IAuthRefreshTokenGenerate;
}
