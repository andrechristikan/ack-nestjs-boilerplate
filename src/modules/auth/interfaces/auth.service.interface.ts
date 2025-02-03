import { ENUM_AUTH_LOGIN_FROM } from 'src/modules/auth/enums/auth.enum';
import { AuthJwtAccessPayloadDto } from 'src/modules/auth/dtos/jwt/auth.jwt.access-payload.dto';
import { AuthJwtRefreshPayloadDto } from 'src/modules/auth/dtos/jwt/auth.jwt.refresh-payload.dto';
import { AuthSocialApplePayloadDto } from 'src/modules/auth/dtos/social/auth.social.apple-payload.dto';
import { AuthSocialGooglePayloadDto } from 'src/modules/auth/dtos/social/auth.social.google-payload.dto';
import {
    IAuthPassword,
    IAuthPasswordOptions,
} from 'src/modules/auth/interfaces/auth.interface';
import { IUserDoc } from 'src/modules/user/interfaces/user.interface';
import { AuthLoginResponseDto } from 'src/modules/auth/dtos/response/auth.login.response.dto';

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
    createPayloadAccessToken(
        data: IUserDoc,
        session: string,
        loginDate: Date,
        loginFrom: ENUM_AUTH_LOGIN_FROM
    ): Promise<AuthJwtAccessPayloadDto>;
    createPayloadRefreshToken({
        user,
        session,
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
    createToken(user: IUserDoc, session: string): Promise<AuthLoginResponseDto>;
    getPasswordAttempt(): Promise<boolean>;
    getPasswordMaxAttempt(): Promise<number>;
    appleGetTokenInfo(code: string): Promise<AuthSocialApplePayloadDto>;
    googleGetTokenInfo(
        accessToken: string
    ): Promise<AuthSocialGooglePayloadDto>;
}
