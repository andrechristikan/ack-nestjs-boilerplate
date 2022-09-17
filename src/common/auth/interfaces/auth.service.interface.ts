import {
    IAuthPassword,
    IAuthPayloadOptions,
    IAuthRefreshTokenOptions,
} from 'src/common/auth/interfaces/auth.interface';

export interface IAuthService {
    createAccessToken(payload: Record<string, any>): Promise<string>;

    validateAccessToken(token: string): Promise<boolean>;

    payloadAccessToken(token: string): Promise<Record<string, any>>;

    createRefreshToken(
        payload: Record<string, any>,
        options?: IAuthRefreshTokenOptions
    ): Promise<string>;

    validateRefreshToken(token: string): Promise<boolean>;

    payloadRefreshToken(token: string): Promise<Record<string, any>>;

    validateUser(
        passwordString: string,
        passwordHash: string
    ): Promise<boolean>;

    createPayloadAccessToken(
        data: Record<string, any>,
        rememberMe: boolean,
        options?: IAuthPayloadOptions
    ): Promise<Record<string, any>>;

    createPayloadRefreshToken(
        _id: string,
        rememberMe: boolean,
        options?: IAuthPayloadOptions
    ): Promise<Record<string, any>>;

    createPassword(password: string): Promise<IAuthPassword>;

    checkPasswordExpired(passwordExpired: Date): Promise<boolean>;

    getTokenType(): Promise<string>;

    getAccessTokenExpirationTime(): Promise<number>;

    getRefreshTokenExpirationTime(rememberMe?: boolean): Promise<number>;

    getIssuer(): Promise<string>;

    getAudience(): Promise<string>;

    getSubject(): Promise<string>;
}
