import {
    IAuthPassword,
    IAuthPayloadOptions,
    IAuthRefreshTokenOptions,
} from 'src/common/auth/interfaces/auth.interface';

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

    encryptPermissionToken(payload: Record<string, any>): Promise<string>;

    decryptPermissionToken({
        data,
    }: Record<string, any>): Promise<Record<string, any>>;

    createPermissionToken(
        payloadHashed: string | Record<string, any>
    ): Promise<string>;

    validatePermissionToken(token: string): Promise<boolean>;

    payloadPermissionToken(token: string): Promise<Record<string, any>>;

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

    createPayloadPermissionToken(
        data: Record<string, any>
    ): Promise<Record<string, any>>;

    createSalt(length: number): Promise<string>;

    createPassword(password: string): Promise<IAuthPassword>;

    checkPasswordExpired(passwordExpired: Date): Promise<boolean>;

    getTokenType(): Promise<string>;

    getAccessTokenExpirationTime(): Promise<number>;

    getRefreshTokenExpirationTime(rememberMe?: boolean): Promise<number>;

    getIssuer(): Promise<string>;

    getAudience(): Promise<string>;

    getSubject(): Promise<string>;

    getPayloadEncryption(): Promise<boolean>;

    getPermissionTokenExpirationTime(): Promise<number>;
}
