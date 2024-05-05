import { AuthJwtAccessPayloadDto } from 'src/common/auth/dtos/jwt/auth.jwt.access-payload.dto';
import { AuthJwtRefreshPayloadDto } from 'src/common/auth/dtos/jwt/auth.jwt.refresh-payload.dto';
import { AuthSocialApplePayloadDto } from 'src/common/auth/dtos/social/auth.social.apple-payload.dto';
import { AuthSocialGooglePayloadDto } from 'src/common/auth/dtos/social/auth.social.google-payload.dto';
import { IAuthPassword } from 'src/common/auth/interfaces/auth.interface';

export interface IAuthService {
    createAccessToken(payload: AuthJwtAccessPayloadDto): Promise<string>;
    validateAccessToken(token: string): Promise<boolean>;
    payloadAccessToken(token: string): Promise<AuthJwtAccessPayloadDto>;
    createRefreshToken(payload: AuthJwtRefreshPayloadDto): Promise<string>;
    validateRefreshToken(token: string): Promise<boolean>;
    payloadRefreshToken(token: string): Promise<AuthJwtRefreshPayloadDto>;
    validateUser(
        passwordString: string,
        passwordHash: string
    ): Promise<boolean>;
    createPayloadAccessToken(
        payload: AuthJwtAccessPayloadDto
    ): Promise<AuthJwtAccessPayloadDto>;
    createPayloadRefreshToken({
        _id,
        loginFrom,
        loginDate,
    }: AuthJwtAccessPayloadDto): Promise<AuthJwtRefreshPayloadDto>;
    createSalt(length: number): Promise<string>;
    createPassword(password: string): Promise<IAuthPassword>;
    createPasswordRandom(): Promise<string>;
    checkPasswordExpired(passwordExpired: Date): Promise<boolean>;
    getLoginDate(): Promise<Date>;
    getTokenType(): Promise<string>;
    getAccessTokenExpirationTime(): Promise<number>;
    getIssuer(): Promise<string>;
    getAudience(): Promise<string>;
    getSubject(): Promise<string>;
    getPasswordAttempt(): Promise<boolean>;
    getPasswordMaxAttempt(): Promise<number>;
    appleGetTokenInfo(code: string): Promise<AuthSocialApplePayloadDto>;
    googleGetTokenInfo(
        accessToken: string
    ): Promise<AuthSocialGooglePayloadDto>;
}
