import { ENUM_AUTH_LOGIN_FROM } from '@modules/auth/enums/auth.enum';
import {
    IAuthJwtAccessTokenPayload,
    IAuthJwtRefreshTokenPayload,
    IAuthPassword,
    IAuthPasswordOptions,
    IAuthSocialApplePayload,
    IAuthSocialGooglePayload,
} from '@modules/auth/interfaces/auth.interface';
import { IUserDoc } from '@modules/user/interfaces/user.interface';
import { AuthLoginResponseDto } from '@modules/auth/dtos/response/auth.login.response.dto';

export interface IAuthService {
    createAccessToken(
        subject: string,
        payload: IAuthJwtAccessTokenPayload,
        jwtid: string
    ): string;
    validateAccessToken(subject: string, token: string): boolean;
    payload<T = any>(token: string): T;
    createRefreshToken(
        subject: string,
        payload: IAuthJwtRefreshTokenPayload,
        jti: string
    ): string;
    validateRefreshToken(subject: string, token: string): boolean;
    validateUser(passwordString: string, passwordHash: string): boolean;
    createPayloadAccessToken(
        data: IUserDoc,
        session: string,
        loginDate: Date,
        loginFrom: ENUM_AUTH_LOGIN_FROM,
    ): IAuthJwtAccessTokenPayload;
    createPayloadRefreshToken({
        user,
        session,
        loginFrom,
        loginDate,
    }: IAuthJwtAccessTokenPayload): IAuthJwtRefreshTokenPayload;
    createSalt(length: number): string;
    createPassword(
        password: string,
        options?: IAuthPasswordOptions
    ): IAuthPassword;
    createPasswordRandom(): string;
    checkPasswordExpired(passwordExpired: Date): boolean;
    createToken(
        user: IUserDoc,
        session: string,
        jti: string
    ): AuthLoginResponseDto;
    refreshToken(
        user: IUserDoc,
        refreshTokenFromRequest: string,
        jti: string
    ): AuthLoginResponseDto;
    getPasswordAttempt(): boolean;
    getPasswordMaxAttempt(): number;
    appleGetTokenInfo(idToken: string): Promise<IAuthSocialApplePayload>;
    googleGetTokenInfo(idToken: string): Promise<IAuthSocialGooglePayload>;
}
