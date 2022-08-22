import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { HelperDateService } from 'src/common/helper/services/helper.date.service';
import { HelperEncryptionService } from 'src/common/helper/services/helper.encryption.service';
import { HelperHashService } from 'src/common/helper/services/helper.hash.service';
import {
    IAuthRefreshTokenOptions,
    IAuthAccessTokenOptions,
} from '../auth.interface';
import { IAuthPassword, IAuthPayloadOptions } from '../auth.interface';

@Injectable()
export class AuthService {
    private readonly accessTokenSecretToken: string;
    private readonly accessTokenExpirationTime: string;
    private readonly accessTokenNotBeforeExpirationTime: string;

    private readonly refreshTokenSecretToken: string;
    private readonly refreshTokenExpirationTime: string;
    private readonly refreshTokenExpirationTimeRememberMe: string;
    private readonly refreshTokenNotBeforeExpirationTime: string;

    private readonly prefixAuthorization: string;
    private readonly audience: string;

    constructor(
        private readonly helperHashService: HelperHashService,
        private readonly helperDateService: HelperDateService,
        private readonly helperEncryptionService: HelperEncryptionService,
        private readonly configService: ConfigService
    ) {
        this.accessTokenSecretToken = this.configService.get<string>(
            'auth.jwt.accessToken.secretKey'
        );
        this.accessTokenExpirationTime = this.configService.get<string>(
            'auth.jwt.accessToken.expirationTime'
        );
        this.accessTokenNotBeforeExpirationTime =
            this.configService.get<string>(
                'auth.jwt.accessToken.notBeforeExpirationTime'
            );

        this.refreshTokenSecretToken = this.configService.get<string>(
            'auth.jwt.refreshToken.secretKey'
        );
        this.refreshTokenExpirationTime = this.configService.get<string>(
            'auth.jwt.refreshToken.expirationTime'
        );
        this.refreshTokenExpirationTimeRememberMe =
            this.configService.get<string>(
                'auth.jwt.refreshToken.expirationTimeRememberMe'
            );
        this.refreshTokenNotBeforeExpirationTime =
            this.configService.get<string>(
                'auth.jwt.refreshToken.notBeforeExpirationTime'
            );

        this.prefixAuthorization = this.configService.get<string>(
            'auth.jwt.prefixAuthorization'
        );
        this.audience = this.configService.get<string>('auth.jwt.audience');
    }

    async createAccessToken(
        payload: Record<string, any>,
        options?: IAuthAccessTokenOptions
    ): Promise<string> {
        return this.helperEncryptionService.jwtEncrypt(payload, {
            secretKey: this.accessTokenSecretToken,
            expiredIn: this.accessTokenExpirationTime,
            notBefore: this.accessTokenNotBeforeExpirationTime,
            audience: options ? options.audience : this.audience,
        });
    }

    async validateAccessToken(
        token: string,
        options?: IAuthAccessTokenOptions
    ): Promise<boolean> {
        return this.helperEncryptionService.jwtVerify(token, {
            secretKey: this.accessTokenSecretToken,
            audience: options ? options.audience : this.audience,
        });
    }

    async payloadAccessToken(token: string): Promise<Record<string, any>> {
        return this.helperEncryptionService.jwtDecrypt(token);
    }

    async createRefreshToken(
        payload: Record<string, any>,
        options?: IAuthRefreshTokenOptions
    ): Promise<string> {
        return this.helperEncryptionService.jwtEncrypt(payload, {
            secretKey: this.refreshTokenSecretToken,
            expiredIn:
                options && options.rememberMe
                    ? this.refreshTokenExpirationTimeRememberMe
                    : this.refreshTokenExpirationTime,
            notBefore:
                options && options.notBeforeExpirationTime
                    ? options.notBeforeExpirationTime
                    : this.refreshTokenNotBeforeExpirationTime,
            audience: options ? options.audience : this.audience,
        });
    }

    async validateRefreshToken(
        token: string,
        options?: IAuthRefreshTokenOptions
    ): Promise<boolean> {
        return this.helperEncryptionService.jwtVerify(token, {
            secretKey: this.refreshTokenSecretToken,
            audience: options ? options.audience : this.audience,
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

    async getAccessTokenExpirationTime(): Promise<string> {
        return this.accessTokenExpirationTime;
    }

    async getRefreshTokenExpirationTime(rememberMe?: boolean): Promise<string> {
        return rememberMe
            ? this.refreshTokenExpirationTime
            : this.refreshTokenExpirationTimeRememberMe;
    }

    async getScope(payload: Record<string, any>): Promise<string> {
        return payload.role.permissions
            .map((a: Record<string, any>) => a.code)
            .join(' ');
    }
}
