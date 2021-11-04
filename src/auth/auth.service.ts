import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Helper } from 'src/helper/helper.decorator';
import { HelperService } from 'src/helper/helper.service';

@Injectable()
export class AuthService {
    private readonly accessTokenSecretToken: string;
    private readonly accessTokenRememberMeExpirationTime: string;
    private readonly accessTokenRememberMeNotBeforeExpirationTime: string;
    private readonly accessTokenExpirationTime: string;
    private readonly accessTokenNotBeforeExpirationTime: string;

    private readonly refreshTokenSecretToken: string;
    private readonly refreshTokenRememberMeExpirationTime: string;
    private readonly refreshTokenRememberMeNotBeforeExpirationTime: string;
    private readonly refreshTokenExpirationTime: string;
    private readonly refreshTokenNotBeforeExpirationTime: string;

    constructor(
        @Helper() private readonly helperService: HelperService,
        private readonly configService: ConfigService
    ) {
        this.accessTokenSecretToken = this.configService.get<string>(
            'auth.jwt.accessToken.secretKey'
        );
        this.accessTokenRememberMeExpirationTime = this.configService.get<string>(
            'auth.jwt.accessToken.rememberMe.expirationTime'
        );
        this.accessTokenRememberMeNotBeforeExpirationTime = this.configService.get<string>(
            'auth.jwt.accessToken.rememberMe.notBeforeExpirationTime'
        );
        this.accessTokenExpirationTime = this.configService.get<string>(
            'auth.jwt.accessToken.expirationTime'
        );
        this.accessTokenNotBeforeExpirationTime = this.configService.get<string>(
            'auth.jwt.accessToken.notBeforeExpirationTime'
        );

        this.refreshTokenSecretToken = this.configService.get<string>(
            'auth.jwt.refreshToken.secretKey'
        );
        this.refreshTokenRememberMeExpirationTime = this.configService.get<string>(
            'auth.jwt.refreshToken.rememberMe.expirationTime'
        );
        this.refreshTokenRememberMeNotBeforeExpirationTime = this.configService.get<string>(
            'auth.jwt.refreshToken.rememberMe.notBeforeExpirationTime'
        );
        this.refreshTokenExpirationTime = this.configService.get<string>(
            'auth.jwt.refreshToken.expirationTime'
        );
        this.refreshTokenNotBeforeExpirationTime = this.configService.get<string>(
            'auth.jwt.refreshToken.notBeforeExpirationTime'
        );
    }

    async createAccessToken(
        payload: Record<string, any>,
        rememberMe: boolean
    ): Promise<string> {
        return this.helperService.jwtCreateToken(payload, {
            secretKey: this.accessTokenSecretToken,
            expiredIn: rememberMe
                ? this.accessTokenRememberMeExpirationTime
                : this.accessTokenExpirationTime,
            notBefore: rememberMe
                ? this.accessTokenRememberMeNotBeforeExpirationTime
                : this.accessTokenNotBeforeExpirationTime
        });
    }

    async validateAccessToken(token: string): Promise<boolean> {
        return this.helperService.jwtVerify(token, {
            secretKey: this.accessTokenSecretToken
        });
    }

    async payloadAccessToken(token: string): Promise<Record<string, any>> {
        return this.helperService.jwtPayload(token, {
            secretKey: this.accessTokenSecretToken
        });
    }

    async createRefreshToken(
        payload: Record<string, any>,
        rememberMe: boolean
    ): Promise<string> {
        return this.helperService.jwtCreateToken(payload, {
            secretKey: this.refreshTokenSecretToken,
            expiredIn: rememberMe
                ? this.refreshTokenRememberMeExpirationTime
                : this.refreshTokenExpirationTime,
            notBefore: rememberMe
                ? this.refreshTokenRememberMeNotBeforeExpirationTime
                : this.refreshTokenNotBeforeExpirationTime
        });
    }

    async validateRefreshToken(token: string): Promise<boolean> {
        return this.helperService.jwtVerify(token, {
            secretKey: this.refreshTokenSecretToken
        });
    }

    async payloadRefreshToken(token: string): Promise<Record<string, any>> {
        return this.helperService.jwtPayload(token, {
            secretKey: this.refreshTokenSecretToken
        });
    }

    async createBasicToken(
        clientId: string,
        clientSecret: string
    ): Promise<string> {
        const token: string = `${clientId}:${clientSecret}`;
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
}
