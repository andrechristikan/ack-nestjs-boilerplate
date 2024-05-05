import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import AppleAuth, { AppleAuthAccessToken, AppleAuthConfig } from 'apple-auth';
import { OAuth2Client, TokenInfo } from 'google-auth-library';
import { HelperDateService } from 'src/common/helper/services/helper.date.service';
import { HelperEncryptionService } from 'src/common/helper/services/helper.encryption.service';
import { HelperHashService } from 'src/common/helper/services/helper.hash.service';
import { HelperStringService } from 'src/common/helper/services/helper.string.service';
import fs from 'fs';
import { IAuthService } from 'src/common/auth/interfaces/auth.service.interface';
import { AuthJwtAccessPayloadDto } from 'src/common/auth/dtos/jwt/auth.jwt.access-payload.dto';
import { AuthJwtRefreshPayloadDto } from 'src/common/auth/dtos/jwt/auth.jwt.refresh-payload.dto';
import { IAuthPassword } from 'src/common/auth/interfaces/auth.interface';
import { AuthSocialApplePayloadDto } from 'src/common/auth/dtos/social/auth.social.apple-payload.dto';
import { AuthSocialGooglePayloadDto } from 'src/common/auth/dtos/social/auth.social.google-payload.dto';

@Injectable()
export class AuthService implements IAuthService {
    // jwt
    private readonly jwtAccessTokenSecretKey: string;
    private readonly jwtAccessTokenExpirationTime: number;

    private readonly jwtRefreshTokenSecretKey: string;
    private readonly jwtRefreshTokenExpirationTime: number;

    private readonly jwtPrefixAuthorization: string;
    private readonly jwtAudience: string;
    private readonly jwtIssuer: string;
    private readonly jwtSubject: string;

    // password
    private readonly passwordExpiredIn: number;
    private readonly passwordSaltLength: number;

    private readonly passwordAttempt: boolean;
    private readonly passwordMaxAttempt: number;

    // apple
    private readonly appleClient: AppleAuth;
    private readonly appleConfigClient: AppleAuthConfig;
    private readonly appleCertP8Path: string;

    // google
    private readonly googleClient: OAuth2Client;

    constructor(
        private readonly helperHashService: HelperHashService,
        private readonly helperDateService: HelperDateService,
        private readonly helperStringService: HelperStringService,
        private readonly helperEncryptionService: HelperEncryptionService,
        private readonly configService: ConfigService
    ) {
        // jwt
        this.jwtAccessTokenSecretKey = this.configService.get<string>(
            'auth.jwt.accessToken.secretKey'
        );
        this.jwtAccessTokenExpirationTime = this.configService.get<number>(
            'auth.jwt.accessToken.expirationTime'
        );

        this.jwtRefreshTokenSecretKey = this.configService.get<string>(
            'auth.jwt.refreshToken.secretKey'
        );
        this.jwtRefreshTokenExpirationTime = this.configService.get<number>(
            'auth.jwt.refreshToken.expirationTime'
        );

        this.jwtPrefixAuthorization = this.configService.get<string>(
            'auth.jwt.prefixAuthorization'
        );
        this.jwtSubject = this.configService.get<string>('auth.jwt.subject');
        this.jwtAudience = this.configService.get<string>('auth.jwt.audience');
        this.jwtIssuer = this.configService.get<string>('auth.jwt.issuer');

        // password
        this.passwordExpiredIn = this.configService.get<number>(
            'auth.password.expiredIn'
        );
        this.passwordSaltLength = this.configService.get<number>(
            'auth.password.saltLength'
        );
        this.passwordAttempt = this.configService.get<boolean>(
            'auth.password.attempt'
        );
        this.passwordMaxAttempt = this.configService.get<number>(
            'auth.password.maxAttempt'
        );

        // apple
        this.appleConfigClient = {
            client_id: this.configService.get<string>('auth.apple.clientId'),
            team_id: this.configService.get<string>('auth.apple.teamId'),
            key_id: this.configService.get<string>('auth.apple.keyId'),
            redirect_uri: this.configService.get<string>(
                'auth.apple.callbackUrl'
            ),
            scope: 'name email',
        };
        this.appleCertP8Path = this.configService.get<string>(
            'auth.apple.certP8Path'
        );

        const certP8: string = fs.readFileSync(this.appleCertP8Path).toString();
        this.appleClient = new AppleAuth(
            this.appleConfigClient,
            certP8,
            'text'
        );

        // google
        this.googleClient = new OAuth2Client(
            this.configService.get<string>('auth.google.clientId'),
            this.configService.get<string>('auth.google.clientSecret')
        );
    }

    async createAccessToken(payload: AuthJwtAccessPayloadDto): Promise<string> {
        return this.helperEncryptionService.jwtEncrypt(
            { data: payload },
            {
                secretKey: this.jwtAccessTokenSecretKey,
                expiredIn: this.jwtAccessTokenExpirationTime,
                audience: this.jwtAudience,
                issuer: this.jwtIssuer,
                subject: this.jwtSubject,
            }
        );
    }

    async validateAccessToken(token: string): Promise<boolean> {
        return this.helperEncryptionService.jwtVerify(token, {
            secretKey: this.jwtAccessTokenSecretKey,
            audience: this.jwtAudience,
            issuer: this.jwtIssuer,
            subject: this.jwtSubject,
        });
    }

    async payloadAccessToken(token: string): Promise<AuthJwtAccessPayloadDto> {
        return this.helperEncryptionService.jwtDecrypt<AuthJwtAccessPayloadDto>(
            token
        );
    }

    async createRefreshToken(
        payload: AuthJwtRefreshPayloadDto
    ): Promise<string> {
        return this.helperEncryptionService.jwtEncrypt(
            { data: payload },
            {
                secretKey: this.jwtRefreshTokenSecretKey,
                expiredIn: this.jwtRefreshTokenExpirationTime,
                audience: this.jwtAudience,
                issuer: this.jwtIssuer,
                subject: this.jwtSubject,
            }
        );
    }

    async validateRefreshToken(token: string): Promise<boolean> {
        return this.helperEncryptionService.jwtVerify(token, {
            secretKey: this.jwtRefreshTokenSecretKey,
            audience: this.jwtAudience,
            issuer: this.jwtIssuer,
            subject: this.jwtSubject,
        });
    }

    async payloadRefreshToken(
        token: string
    ): Promise<AuthJwtRefreshPayloadDto> {
        return this.helperEncryptionService.jwtDecrypt<AuthJwtRefreshPayloadDto>(
            token
        );
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
        payload: AuthJwtAccessPayloadDto
    ): Promise<AuthJwtAccessPayloadDto> {
        return payload;
    }

    async createPayloadRefreshToken({
        _id,
        loginFrom,
        loginDate,
    }: AuthJwtAccessPayloadDto): Promise<AuthJwtRefreshPayloadDto> {
        return {
            _id,
            loginFrom,
            loginDate,
        };
    }

    async createSalt(length: number): Promise<string> {
        return this.helperHashService.randomSalt(length);
    }

    async createPassword(password: string): Promise<IAuthPassword> {
        const salt: string = await this.createSalt(this.passwordSaltLength);

        const passwordExpired: Date = this.helperDateService.forwardInSeconds(
            this.passwordExpiredIn
        );
        const passwordCreated: Date = this.helperDateService.create();
        const passwordHash = this.helperHashService.bcrypt(password, salt);
        return {
            passwordHash,
            passwordExpired,
            passwordCreated,
            salt,
        };
    }

    async createPasswordRandom(): Promise<string> {
        return this.helperStringService.random(15);
    }

    async checkPasswordExpired(passwordExpired: Date): Promise<boolean> {
        const today: Date = this.helperDateService.create();
        const passwordExpiredConvert: Date =
            this.helperDateService.create(passwordExpired);

        return today > passwordExpiredConvert;
    }

    async getLoginDate(): Promise<Date> {
        return this.helperDateService.create();
    }

    async getTokenType(): Promise<string> {
        return this.jwtPrefixAuthorization;
    }

    async getAccessTokenExpirationTime(): Promise<number> {
        return this.jwtAccessTokenExpirationTime;
    }

    async getIssuer(): Promise<string> {
        return this.jwtIssuer;
    }

    async getAudience(): Promise<string> {
        return this.jwtAudience;
    }

    async getSubject(): Promise<string> {
        return this.jwtSubject;
    }

    async getPasswordAttempt(): Promise<boolean> {
        return this.passwordAttempt;
    }

    async getPasswordMaxAttempt(): Promise<number> {
        return this.passwordMaxAttempt;
    }

    async appleGetTokenInfo(code: string): Promise<AuthSocialApplePayloadDto> {
        const check: AppleAuthAccessToken =
            await this.appleClient.accessToken(code);

        const payload =
            this.helperEncryptionService.jwtDecrypt<AuthSocialApplePayloadDto>(
                check.access_token
            );

        return { email: payload.email };
    }

    async googleGetTokenInfo(
        accessToken: string
    ): Promise<AuthSocialGooglePayloadDto> {
        const payload: TokenInfo =
            await this.googleClient.getTokenInfo(accessToken);

        return { email: payload.email };
    }
}
