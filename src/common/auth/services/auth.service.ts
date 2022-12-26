import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
    IAuthPassword,
    IAuthPayloadOptions,
    IAuthRefreshTokenOptions,
} from 'src/common/auth/interfaces/auth.interface';
import { IAuthService } from 'src/common/auth/interfaces/auth.service.interface';
import { HelperDateService } from 'src/common/helper/services/helper.date.service';
import { HelperEncryptionService } from 'src/common/helper/services/helper.encryption.service';
import { HelperHashService } from 'src/common/helper/services/helper.hash.service';

@Injectable()
export class AuthService implements IAuthService {
    private readonly accessTokenSecretKey: string;
    private readonly accessTokenExpirationTime: number;
    private readonly accessTokenNotBeforeExpirationTime: number;
    private readonly accessTokenEncryptKey: string;
    private readonly accessTokenEncryptIv: string;

    private readonly refreshTokenSecretKey: string;
    private readonly refreshTokenExpirationTime: number;
    private readonly refreshTokenExpirationTimeRememberMe: number;
    private readonly refreshTokenNotBeforeExpirationTime: number;
    private readonly refreshTokenEncryptKey: string;
    private readonly refreshTokenEncryptIv: string;

    private readonly payloadEncryption: boolean;
    private readonly prefixAuthorization: string;
    private readonly audience: string;
    private readonly issuer: string;
    private readonly subject: string;

    private readonly passwordExpiredIn: number;
    private readonly passwordSaltLength: number;

    private readonly permissionTokenSecretToken: string;
    private readonly permissionTokenExpirationTime: number;
    private readonly permissionTokenNotBeforeExpirationTime: number;
    private readonly permissionTokenEncryptKey: string;
    private readonly permissionTokenEncryptIv: string;

    constructor(
        private readonly helperHashService: HelperHashService,
        private readonly helperDateService: HelperDateService,
        private readonly helperEncryptionService: HelperEncryptionService,
        private readonly configService: ConfigService
    ) {
        this.accessTokenSecretKey = this.configService.get<string>(
            'auth.accessToken.secretKey'
        );
        this.accessTokenExpirationTime = this.configService.get<number>(
            'auth.accessToken.expirationTime'
        );
        this.accessTokenNotBeforeExpirationTime =
            this.configService.get<number>(
                'auth.accessToken.notBeforeExpirationTime'
            );
        this.accessTokenEncryptKey = this.configService.get<string>(
            'auth.accessToken.encryptKey'
        );
        this.accessTokenEncryptIv = this.configService.get<string>(
            'auth.accessToken.encryptIv'
        );

        this.refreshTokenSecretKey = this.configService.get<string>(
            'auth.refreshToken.secretKey'
        );
        this.refreshTokenExpirationTime = this.configService.get<number>(
            'auth.refreshToken.expirationTime'
        );
        this.refreshTokenExpirationTimeRememberMe =
            this.configService.get<number>(
                'auth.refreshToken.expirationTimeRememberMe'
            );
        this.refreshTokenNotBeforeExpirationTime =
            this.configService.get<number>(
                'auth.refreshToken.notBeforeExpirationTime'
            );
        this.refreshTokenEncryptKey = this.configService.get<string>(
            'auth.refreshToken.encryptKey'
        );
        this.refreshTokenEncryptIv = this.configService.get<string>(
            'auth.refreshToken.encryptIv'
        );

        this.payloadEncryption = this.configService.get<boolean>(
            'auth.payloadEncryption'
        );
        this.prefixAuthorization = this.configService.get<string>(
            'auth.prefixAuthorization'
        );
        this.subject = this.configService.get<string>('auth.subject');
        this.audience = this.configService.get<string>('auth.audience');
        this.issuer = this.configService.get<string>('auth.issuer');

        this.passwordExpiredIn = this.configService.get<number>(
            'auth.password.expiredIn'
        );
        this.passwordSaltLength = this.configService.get<number>(
            'auth.password.saltLength'
        );

        this.permissionTokenSecretToken = this.configService.get<string>(
            'auth.permissionToken.secretKey'
        );
        this.permissionTokenExpirationTime = this.configService.get<number>(
            'auth.permissionToken.expirationTime'
        );
        this.permissionTokenNotBeforeExpirationTime =
            this.configService.get<number>(
                'auth.permissionToken.notBeforeExpirationTime'
            );
        this.permissionTokenEncryptKey = this.configService.get<string>(
            'auth.permissionToken.encryptKey'
        );
        this.permissionTokenEncryptIv = this.configService.get<string>(
            'auth.permissionToken.encryptIv'
        );
    }

    async encryptAccessToken(payload: Record<string, any>): Promise<string> {
        return this.helperEncryptionService.aes256Encrypt(
            payload,
            this.accessTokenEncryptKey,
            this.accessTokenEncryptIv
        );
    }

    async decryptAccessToken({
        data,
    }: Record<string, any>): Promise<Record<string, any>> {
        return this.helperEncryptionService.aes256Decrypt(
            data,
            this.accessTokenEncryptKey,
            this.accessTokenEncryptIv
        ) as Record<string, any>;
    }

    async createAccessToken(
        payloadHashed: string | Record<string, any>
    ): Promise<string> {
        return this.helperEncryptionService.jwtEncrypt(
            { data: payloadHashed },
            {
                secretKey: this.accessTokenSecretKey,
                expiredIn: this.accessTokenExpirationTime,
                notBefore: this.accessTokenNotBeforeExpirationTime,
                audience: this.audience,
                issuer: this.issuer,
                subject: this.subject,
            }
        );
    }

    async validateAccessToken(token: string): Promise<boolean> {
        return this.helperEncryptionService.jwtVerify(token, {
            secretKey: this.accessTokenSecretKey,
            audience: this.audience,
            issuer: this.issuer,
            subject: this.subject,
        });
    }

    async payloadAccessToken(token: string): Promise<Record<string, any>> {
        return this.helperEncryptionService.jwtDecrypt(token);
    }

    async encryptRefreshToken(payload: Record<string, any>): Promise<string> {
        return this.helperEncryptionService.aes256Encrypt(
            payload,
            this.refreshTokenEncryptKey,
            this.refreshTokenEncryptIv
        );
    }

    async decryptRefreshToken({
        data,
    }: Record<string, any>): Promise<Record<string, any>> {
        return this.helperEncryptionService.aes256Decrypt(
            data,
            this.refreshTokenEncryptKey,
            this.refreshTokenEncryptIv
        ) as Record<string, any>;
    }

    async createRefreshToken(
        payloadHashed: string | Record<string, any>,
        options?: IAuthRefreshTokenOptions
    ): Promise<string> {
        return this.helperEncryptionService.jwtEncrypt(
            { data: payloadHashed },
            {
                secretKey: this.refreshTokenSecretKey,
                expiredIn: options?.rememberMe
                    ? this.refreshTokenExpirationTimeRememberMe
                    : this.refreshTokenExpirationTime,
                notBefore:
                    options?.notBeforeExpirationTime ??
                    this.refreshTokenNotBeforeExpirationTime,
                audience: this.audience,
                issuer: this.issuer,
                subject: this.subject,
            }
        );
    }

    async validateRefreshToken(token: string): Promise<boolean> {
        return this.helperEncryptionService.jwtVerify(token, {
            secretKey: this.refreshTokenSecretKey,
            audience: this.audience,
            issuer: this.issuer,
            subject: this.subject,
        });
    }

    async payloadRefreshToken(token: string): Promise<Record<string, any>> {
        return this.helperEncryptionService.jwtDecrypt(token);
    }

    async encryptPermissionToken(
        payload: Record<string, any>
    ): Promise<string> {
        return this.helperEncryptionService.aes256Encrypt(
            payload,
            this.permissionTokenEncryptKey,
            this.permissionTokenEncryptIv
        );
    }

    async decryptPermissionToken({
        data,
    }: Record<string, any>): Promise<Record<string, any>> {
        return this.helperEncryptionService.aes256Decrypt(
            data,
            this.permissionTokenEncryptKey,
            this.permissionTokenEncryptIv
        ) as Record<string, any>;
    }

    async createPermissionToken(
        payloadHashed: string | Record<string, any>
    ): Promise<string> {
        return this.helperEncryptionService.jwtEncrypt(
            { data: payloadHashed },
            {
                secretKey: this.permissionTokenSecretToken,
                expiredIn: this.permissionTokenExpirationTime,
                notBefore: this.permissionTokenNotBeforeExpirationTime,
                audience: this.audience,
                issuer: this.issuer,
                subject: this.subject,
            }
        );
    }

    async validatePermissionToken(token: string): Promise<boolean> {
        return this.helperEncryptionService.jwtVerify(token, {
            secretKey: this.permissionTokenSecretToken,
            audience: this.audience,
            issuer: this.issuer,
            subject: this.subject,
        });
    }

    async payloadPermissionToken(token: string): Promise<Record<string, any>> {
        return this.helperEncryptionService.jwtDecrypt(token);
    }

    async validateUser(
        passwordString: string,
        passwordHash: string
    ): Promise<boolean> {
        return this.helperHashService.bcryptCompare(
            passwordString,
            passwordHash
        );
    }

    async createPayloadAccessToken(
        data: Record<string, any>,
        rememberMe: boolean,
        options?: IAuthPayloadOptions
    ): Promise<Record<string, any>> {
        return {
            ...data,
            rememberMe,
            loginDate: options?.loginDate ?? this.helperDateService.create(),
        };
    }

    async createPayloadRefreshToken(
        _id: string,
        rememberMe: boolean,
        options?: IAuthPayloadOptions
    ): Promise<Record<string, any>> {
        return {
            _id,
            rememberMe,
            loginDate: options?.loginDate,
        };
    }

    async createPayloadPermissionToken(
        data: Record<string, any>
    ): Promise<Record<string, any>> {
        return data;
    }

    async createPassword(password: string): Promise<IAuthPassword> {
        const salt: string = this.helperHashService.randomSalt(
            this.passwordSaltLength
        );

        const passwordExpired: Date = this.helperDateService.forwardInSeconds(
            this.passwordExpiredIn
        );
        const passwordHash = this.helperHashService.bcrypt(password, salt);
        return {
            passwordHash,
            passwordExpired,
            salt,
        };
    }

    async checkPasswordExpired(passwordExpired: Date): Promise<boolean> {
        const today: Date = this.helperDateService.create();
        const passwordExpiredConvert: Date =
            this.helperDateService.create(passwordExpired);

        return today > passwordExpiredConvert;
    }

    async getTokenType(): Promise<string> {
        return this.prefixAuthorization;
    }

    async getAccessTokenExpirationTime(): Promise<number> {
        return this.accessTokenExpirationTime;
    }

    async getRefreshTokenExpirationTime(rememberMe?: boolean): Promise<number> {
        return rememberMe
            ? this.refreshTokenExpirationTimeRememberMe
            : this.refreshTokenExpirationTime;
    }

    async getIssuer(): Promise<string> {
        return this.issuer;
    }

    async getAudience(): Promise<string> {
        return this.audience;
    }

    async getSubject(): Promise<string> {
        return this.subject;
    }

    async getPayloadEncryption(): Promise<boolean> {
        return this.payloadEncryption;
    }

    async getPermissionTokenExpirationTime(): Promise<number> {
        return this.permissionTokenExpirationTime;
    }
}
