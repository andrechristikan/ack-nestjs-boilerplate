import { Document } from 'mongoose';
import { ENUM_AUTH_LOGIN_FROM } from 'src/modules/auth/enums/auth.enum';
import { AuthJwtAccessPayloadDto } from 'src/modules/auth/dtos/jwt/auth.jwt.access-payload.dto';
import { AuthJwtRefreshPayloadDto } from 'src/modules/auth/dtos/jwt/auth.jwt.refresh-payload.dto';
import { AuthSocialApplePayloadDto } from 'src/modules/auth/dtos/social/auth.social.apple-payload.dto';
import { AuthSocialGooglePayloadDto } from 'src/modules/auth/dtos/social/auth.social.google-payload.dto';
import {
    IAuthPassword,
    IAuthPasswordOptions,
} from 'src/modules/auth/interfaces/auth.interface';

export interface IAuthService {
    createAccessToken(
        subject: string,
        payload: AuthJwtAccessPayloadDto
    ): Promise<string>;
    validateAccessToken(subject: string, token: string): Promise<boolean>;
    payloadAccessToken(token: string): Promise<AuthJwtAccessPayloadDto>;
    createRefreshToken(
        subject: string,
        payload: AuthJwtRefreshPayloadDto
    ): Promise<string>;
    validateRefreshToken(subject: string, token: string): Promise<boolean>;
    payloadRefreshToken(token: string): Promise<AuthJwtRefreshPayloadDto>;
    validateUser(
        passwordString: string,
        passwordHash: string
    ): Promise<boolean>;
    createPayloadAccessToken<T extends Document>(
        data: T,
        loginFrom: ENUM_AUTH_LOGIN_FROM
    ): Promise<AuthJwtAccessPayloadDto>;
    createPayloadRefreshToken({
        _id,
        loginFrom,
        loginDate,
    }: AuthJwtAccessPayloadDto): Promise<AuthJwtRefreshPayloadDto>;
    createSalt(length: number): Promise<string>;
    createPassword(
        password: string,
        options?: IAuthPasswordOptions
    ): Promise<IAuthPassword>;
    createPasswordRandom(): Promise<string>;
    checkPasswordExpired(passwordExpired: Date): Promise<boolean>;
    getTokenType(): Promise<string>;
    getAccessTokenExpirationTime(): Promise<number>;
    getRefreshTokenExpirationTime(): Promise<number>;
    getIssuer(): Promise<string>;
    getAudience(): Promise<string>;
    getPasswordAttempt(): Promise<boolean>;
    getPasswordMaxAttempt(): Promise<number>;
    appleGetTokenInfo(code: string): Promise<AuthSocialApplePayloadDto>;
    googleGetTokenInfo(
        accessToken: string
    ): Promise<AuthSocialGooglePayloadDto>;
}
