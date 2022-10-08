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
    private readonly accessTokenSecretToken: string;
    private readonly accessTokenExpirationTime: number;
    private readonly accessTokenNotBeforeExpirationTime: number;
    private readonly accessTokenEncryptKey: string;
    private readonly accessTokenEncryptIv: string;

    private readonly refreshTokenSecretToken: string;
    private readonly refreshTokenExpirationTime: number;
    private readonly refreshTokenExpirationTimeRememberMe: number;
    private readonly refreshTokenNotBeforeExpirationTime: number;
    private readonly refreshTokenEncryptKey: string;
    private readonly refreshTokenEncryptIv: string;

    private readonly prefixAuthorization: string;
    private readonly audience: string;
    private readonly issuer: string;
    private readonly subject: string;

    constructor(
        private readonly helperHashService: HelperHashService,
        private readonly helperDateService: HelperDateService,
        private readonly helperEncryptionService: HelperEncryptionService,
        private readonly configService: ConfigService
    ) {
        this.accessTokenSecretToken = this.configService.get<string>(
            'auth.jwt.accessToken.secretKey'
        );
        this.accessTokenExpirationTime = this.configService.get<number>(
            'auth.jwt.accessToken.expirationTime'
        );
        this.accessTokenNotBeforeExpirationTime =
            this.configService.get<number>(
                'auth.jwt.accessToken.notBeforeExpirationTime'
            );
        this.accessTokenEncryptKey = this.configService.get<string>(
            'auth.jwt.accessToken.encryptKey'
        );
        this.accessTokenEncryptIv = this.configService.get<string>(
            'auth.jwt.accessToken.encryptIv'
        );

        this.refreshTokenSecretToken = this.configService.get<string>(
            'auth.jwt.refreshToken.secretKey'
        );
        this.refreshTokenExpirationTime = this.configService.get<number>(
            'auth.jwt.refreshToken.expirationTime'
        );
        this.refreshTokenExpirationTimeRememberMe =
            this.configService.get<number>(
                'auth.jwt.refreshToken.expirationTimeRememberMe'
            );
        this.refreshTokenNotBeforeExpirationTime =
            this.configService.get<number>(
                'auth.jwt.refreshToken.notBeforeExpirationTime'
            );
        this.refreshTokenEncryptKey = this.configService.get<string>(
            'auth.jwt.refreshToken.encryptKey'
        );
        this.refreshTokenEncryptIv = this.configService.get<string>(
            'auth.jwt.refreshToken.encryptIv'
        );

        this.prefixAuthorization = this.configService.get<string>(
            'auth.jwt.prefixAuthorization'
        );
        this.subject = this.configService.get<string>('auth.jwt.subject');
        this.audience = this.configService.get<string>('auth.jwt.audience');
        this.issuer = this.configService.get<string>('auth.jwt.issuer');
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

    async createAccessToken(payloadHashed: string): Promise<string> {
        return this.helperEncryptionService.jwtEncrypt(
            { data: payloadHashed },
            {
                secretKey: this.accessTokenSecretToken,
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
            secretKey: this.accessTokenSecretToken,
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
        payloadHashed: string,
        options?: IAuthRefreshTokenOptions
    ): Promise<string> {
        return this.helperEncryptionService.jwtEncrypt(
            { data: payloadHashed },
            {
                secretKey: this.refreshTokenSecretToken,
                expiredIn:
                    options && options.rememberMe
                        ? this.refreshTokenExpirationTimeRememberMe
                        : this.refreshTokenExpirationTime,
                notBefore:
                    options && options.notBeforeExpirationTime
                        ? options.notBeforeExpirationTime
                        : this.refreshTokenNotBeforeExpirationTime,
                audience: this.audience,
                issuer: this.issuer,
                subject: this.subject,
            }
        );
    }

    async validateRefreshToken(token: string): Promise<boolean> {
        return this.helperEncryptionService.jwtVerify(token, {
            secretKey: this.refreshTokenSecretToken,
            audience: this.audience,
            issuer: this.issuer,
            subject: this.subject,
        });
    }

    async payloadRefreshToken(token: string): Promise<Record<string, any>> {
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
            loginDate:
                options && options.loginDate
                    ? options.loginDate
                    : this.helperDateService.create(),
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
            loginDate:
                options && options.loginDate ? options.loginDate : undefined,
        };
    }

    async createPassword(password: string): Promise<IAuthPassword> {
        const saltLength: number = this.configService.get<number>(
            'auth.password.saltLength'
        );

        const salt: string = this.helperHashService.randomSalt(saltLength);

        const passwordExpiredInMs: number = this.configService.get<number>(
            'auth.password.expiredInMs'
        );
        const passwordExpired: Date =
            this.helperDateService.forwardInMilliseconds(passwordExpiredInMs);
        const passwordHash = this.helperHashService.bcrypt(password, salt);
        return {
            passwordHash,
            passwordExpired,
            salt,
        };
    }

    async checkPasswordExpired(passwordExpired: Date): Promise<boolean> {
        const today: Date = this.helperDateService.create();
        const passwordExpiredConvert: Date = this.helperDateService.create({
            date: passwordExpired,
        });

        if (today > passwordExpiredConvert) {
            return true;
        }

        return false;
    }

    async getTokenType(): Promise<string> {
        return this.prefixAuthorization;
    }

    async getAccessTokenExpirationTime(): Promise<number> {
        return this.accessTokenExpirationTime;
    }

    async getRefreshTokenExpirationTime(rememberMe?: boolean): Promise<number> {
        return rememberMe
            ? this.refreshTokenExpirationTime
            : this.refreshTokenExpirationTimeRememberMe;
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
}
