import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { plainToInstance } from 'class-transformer';
import { IUserDocument } from 'src/user/user.interface';
import { HelperDateService } from 'src/utils/helper/service/helper.date.service';
import { HelperEncryptionService } from 'src/utils/helper/service/helper.encryption.service';
import { HelperHashService } from 'src/utils/helper/service/helper.hash.service';
import { IAuthPassword, IAuthPayloadOptions } from '../auth.interface';
import { AuthLoginDto } from '../dto/auth.login.dto';
import { AuthLoginSerialization } from '../serialization/auth.login.serialization';

@Injectable()
export class AuthService {
    private readonly accessTokenSecretToken: string;
    private readonly accessTokenExpirationTime: string;
    private readonly accessTokenNotBeforeExpirationTime: string;

    private readonly refreshTokenSecretToken: string;
    private readonly refreshTokenExpirationTime: string;
    private readonly refreshTokenExpirationTimeRememberMe: string;
    private readonly refreshTokenNotBeforeExpirationTime: string;

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
    }

    async createAccessToken(payload: Record<string, any>): Promise<string> {
        return this.helperEncryptionService.jwtEncrypt(payload, {
            secretKey: this.accessTokenSecretToken,
            expiredIn: this.accessTokenExpirationTime,
            notBefore: this.accessTokenNotBeforeExpirationTime,
        });
    }

    async validateAccessToken(token: string): Promise<boolean> {
        return this.helperEncryptionService.jwtVerify(token, {
            secretKey: this.accessTokenSecretToken,
        });
    }

    async payloadAccessToken(token: string): Promise<Record<string, any>> {
        return this.helperEncryptionService.jwtDecrypt(token);
    }

    async createRefreshToken(
        payload: Record<string, any>,
        rememberMe: boolean,
        test?: boolean
    ): Promise<string> {
        return this.helperEncryptionService.jwtEncrypt(payload, {
            secretKey: this.refreshTokenSecretToken,
            expiredIn: rememberMe
                ? this.refreshTokenExpirationTimeRememberMe
                : this.refreshTokenExpirationTime,
            notBefore: test ? '0' : this.refreshTokenNotBeforeExpirationTime,
        });
    }

    async validateRefreshToken(token: string): Promise<boolean> {
        return this.helperEncryptionService.jwtVerify(token, {
            secretKey: this.refreshTokenSecretToken,
        });
    }

    async payloadRefreshToken(token: string): Promise<Record<string, any>> {
        return this.helperEncryptionService.jwtDecrypt(token);
    }

    async createBasicToken(
        clientId: string,
        clientSecret: string
    ): Promise<string> {
        const token = `${clientId}:${clientSecret}`;
        return this.helperEncryptionService.base64Decrypt(token);
    }

    async validateBasicToken(
        clientBasicToken: string,
        ourBasicToken: string
    ): Promise<boolean> {
        if (ourBasicToken !== clientBasicToken) {
            return false;
        }
        return true;
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
        data: AuthLoginDto,
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
        { _id }: AuthLoginSerialization,
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

    async serializationLogin(
        data: IUserDocument
    ): Promise<AuthLoginSerialization> {
        return plainToInstance(AuthLoginSerialization, data);
    }

    async createPassword(password: string): Promise<IAuthPassword> {
        const saltLength: number = this.configService.get<number>(
            'auth.password.saltLength'
        );

        const salt: string = await this.helperHashService.randomSalt(
            saltLength
        );

        const passwordExpiredInDays: number = this.configService.get<number>(
            'auth.password.expiredInDay'
        );
        const passwordExpiredDate: Date = this.helperDateService.forwardInDays(
            passwordExpiredInDays
        );
        const passwordHash = await this.helperHashService.bcrypt(
            password,
            salt
        );
        return {
            passwordHash,
            passwordExpiredDate,
            salt,
        };
    }
}
