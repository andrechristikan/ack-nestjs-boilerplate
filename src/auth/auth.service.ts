import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { plainToInstance } from 'class-transformer';
import { Helper } from 'src/helper/helper.decorator';
import { HelperService } from 'src/helper/helper.service';
import { IUserDocument } from 'src/user/user.interface';
import { IAuthPassword, IAuthPayloadOptions } from './auth.interface';
import { AuthLoginTransformer } from './transformer/auth.login.transformer';

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
        @Helper() private readonly helperService: HelperService,
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
        return this.helperService.jwtCreateToken(payload, {
            secretKey: this.accessTokenSecretToken,
            expiredIn: this.accessTokenExpirationTime,
            notBefore: this.accessTokenNotBeforeExpirationTime,
        });
    }

    async validateAccessToken(token: string): Promise<boolean> {
        return this.helperService.jwtVerify(token, {
            secretKey: this.accessTokenSecretToken,
        });
    }

    async payloadAccessToken(token: string): Promise<Record<string, any>> {
        return this.helperService.jwtPayload(token, {
            secretKey: this.accessTokenSecretToken,
        });
    }

    async createRefreshToken(
        payload: Record<string, any>,
        rememberMe: boolean,
        test?: boolean
    ): Promise<string> {
        return this.helperService.jwtCreateToken(payload, {
            secretKey: this.refreshTokenSecretToken,
            expiredIn: rememberMe
                ? this.refreshTokenExpirationTimeRememberMe
                : this.refreshTokenExpirationTime,
            notBefore: test ? '0' : this.refreshTokenNotBeforeExpirationTime,
        });
    }

    async validateRefreshToken(token: string): Promise<boolean> {
        return this.helperService.jwtVerify(token, {
            secretKey: this.refreshTokenSecretToken,
        });
    }

    async payloadRefreshToken(token: string): Promise<Record<string, any>> {
        return this.helperService.jwtPayload(token, {
            secretKey: this.refreshTokenSecretToken,
        });
    }

    async createBasicToken(
        clientId: string,
        clientSecret: string
    ): Promise<string> {
        const token = `${clientId}:${clientSecret}`;
        return this.helperService.base64Encrypt(token);
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
        return this.helperService.bcryptComparePassword(
            passwordString,
            passwordHash
        );
    }

    async loginExpiredDate(rememberMe: boolean): Promise<Date> {
        const expired: string = rememberMe
            ? this.refreshTokenExpirationTimeRememberMe.replace('d', '')
            : this.refreshTokenExpirationTime.replace('d', '');
        return this.helperService.dateTimeForwardInDays(parseInt(expired));
    }

    async createPayloadAccessToken(
        data: AuthLoginTransformer,
        rememberMe: boolean,
        options?: IAuthPayloadOptions
    ): Promise<Record<string, any>> {
        const login = new Date();
        const loginExpiredDate = await this.loginExpiredDate(rememberMe);
        return {
            ...data,
            rememberMe,
            loginDate: options && options.loginDate ? options.loginDate : login,
            loginExpiredDate:
                options && options.loginExpiredDate
                    ? options.loginExpiredDate
                    : loginExpiredDate,
        };
    }

    async createPayloadRefreshToken(
        { _id }: AuthLoginTransformer,
        rememberMe: boolean,
        options?: IAuthPayloadOptions
    ): Promise<Record<string, any>> {
        return {
            _id,
            rememberMe,
            loginDate:
                options && options.loginDate ? options.loginDate : undefined,
            loginExpiredDate:
                options && options.loginExpiredDate
                    ? options.loginExpiredDate
                    : undefined,
        };
    }

    async mapLogin(data: IUserDocument): Promise<AuthLoginTransformer> {
        return plainToInstance(AuthLoginTransformer, data);
    }

    async createPassword(password: string): Promise<IAuthPassword> {
        const saltLength: number = this.configService.get<number>(
            'auth.password.saltLength'
        );

        const salt: string = await this.helperService.randomSalt(saltLength);

        const passwordExpiredInDays: number = this.configService.get<number>(
            'auth.password.expiredInDay'
        );
        const passwordExpiredDate: Date =
            await this.helperService.dateTimeForwardInDays(
                passwordExpiredInDays
            );
        const passwordHash = await this.helperService.bcryptHashPassword(
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
