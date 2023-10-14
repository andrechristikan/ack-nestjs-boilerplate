import {
    IAuthPassword,
    IAuthPayloadOptions,
    IAuthRefreshTokenOptions,
} from 'src/common/auth/interfaces/auth.interface';
import { AuthAccessPayloadSerialization } from 'src/common/auth/serializations/auth.access-payload.serialization';
import { AuthRefreshPayloadSerialization } from 'src/common/auth/serializations/auth.refresh-payload.serialization';
import { IHelperGooglePayload } from 'src/common/helper/interfaces/helper.interface';

export interface IAuthService {
    encryptAccessToken(payload: Record<string, any>): Promise<string>;
    decryptAccessToken(
        payload: Record<string, any>
    ): Promise<Record<string, any>>;
    createAccessToken(
        payloadHashed: string | Record<string, any>
    ): Promise<string>;
    validateAccessToken(token: string): Promise<boolean>;
    payloadAccessToken(token: string): Promise<Record<string, any>>;
    encryptRefreshToken(payload: Record<string, any>): Promise<string>;
    decryptRefreshToken(
        payload: Record<string, any>
    ): Promise<Record<string, any>>;
    createRefreshToken(
        payloadHashed: string | Record<string, any>,
        options?: IAuthRefreshTokenOptions
    ): Promise<string>;
    validateRefreshToken(token: string): Promise<boolean>;
    payloadRefreshToken(token: string): Promise<Record<string, any>>;
    validateUser(
        passwordString: string,
        passwordHash: string
    ): Promise<boolean>;
    createPayloadAccessToken(
        user: Record<string, any>,
        { loginFrom, loginWith, loginDate }: IAuthPayloadOptions
    ): Promise<AuthAccessPayloadSerialization>;
    createPayloadRefreshToken(
        _id: string,
        { loginFrom, loginWith, loginDate }: AuthAccessPayloadSerialization
    ): Promise<AuthRefreshPayloadSerialization>;
    createSalt(length: number): Promise<string>;
    createPassword(password: string): Promise<IAuthPassword>;
    createPasswordRandom(): Promise<string>;
    checkPasswordExpired(passwordExpired: Date): Promise<boolean>;
    getLoginDate(): Promise<Date>;
    getTokenType(): Promise<string>;
    getAccessTokenExpirationTime(): Promise<number>;
    getRefreshTokenExpirationTime(): Promise<number>;
    getIssuer(): Promise<string>;
    getAudience(): Promise<string>;
    getSubject(): Promise<string>;
    getPayloadEncryption(): Promise<boolean>;
    googleGetTokenInfo(accessToken: string): Promise<IHelperGooglePayload>;
}
