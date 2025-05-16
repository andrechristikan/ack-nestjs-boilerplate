import { ENUM_AUTH_LOGIN_FROM } from 'src/modules/auth/enums/auth.enum';
import {
    IAuthJwtAccessTokenPayload,
    IAuthJwtRefreshTokenPayload,
    IAuthPassword,
    IAuthPasswordOptions,
    IAuthSocialApplePayload,
    IAuthSocialGooglePayload,
} from 'src/modules/auth/interfaces/auth.interface';
import { IUserDoc } from 'src/modules/user/interfaces/user.interface';
import { AuthLoginResponseDto } from 'src/modules/auth/dtos/response/auth.login.response.dto';

export interface IAuthService {
    createAccessToken(
        subject: string,
        payload: IAuthJwtAccessTokenPayload
    ): string;
    validateAccessToken(subject: string, token: string): boolean;
    payload<T = any>(token: string): T;
    createRefreshToken(
        subject: string,
        payload: IAuthJwtRefreshTokenPayload
    ): string;
    validateRefreshToken(subject: string, token: string): boolean;
    validateUser(passwordString: string, passwordHash: string): boolean;
    createPayloadAccessToken(
        data: IUserDoc,
        session: string,
        loginDate: Date,
        loginFrom: ENUM_AUTH_LOGIN_FROM
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
    createToken(user: IUserDoc, session: string): AuthLoginResponseDto;
    refreshToken(
        user: IUserDoc,
        refreshTokenFromRequest: string
    ): AuthLoginResponseDto;
    getPasswordAttempt(): boolean;
    getPasswordMaxAttempt(): number;
    appleGetTokenInfo(idToken: string): Promise<IAuthSocialApplePayload>;
    googleGetTokenInfo(idToken: string): Promise<IAuthSocialGooglePayload>;
}
