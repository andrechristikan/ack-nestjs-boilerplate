import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
    AuthJwtAccessPayloadDto,
    AuthJwtAccessPayloadUserDto,
} from 'src/common/auth/dtos/jwt/auth.jwt.access-payload.dto';
import { AuthJwtRefreshPayloadDto } from 'src/common/auth/dtos/jwt/auth.jwt.refresh-payload.dto';
import {
    IAuthPassword,
    IAuthPayloadOptions,
} from 'src/common/auth/interfaces/auth.interface';
import { IAuthService } from 'src/common/auth/interfaces/auth.service.interface';
import {
    IHelperApplePayload,
    IHelperGooglePayload,
} from 'src/common/helper/interfaces/helper.interface';
import { HelperAppleService } from 'src/common/helper/services/helper.apple.service';
import { HelperDateService } from 'src/common/helper/services/helper.date.service';
import { HelperEncryptionService } from 'src/common/helper/services/helper.encryption.service';
import { HelperGoogleService } from 'src/common/helper/services/helper.google.service';
import { HelperHashService } from 'src/common/helper/services/helper.hash.service';
import { HelperStringService } from 'src/common/helper/services/helper.string.service';

@Injectable()
export class AuthService implements IAuthService {
    private readonly accessTokenSecretKey: string;
    private readonly accessTokenExpirationTime: number;

    private readonly refreshTokenSecretKey: string;
    private readonly refreshTokenExpirationTime: number;

    private readonly prefixAuthorization: string;
    private readonly audience: string;
    private readonly issuer: string;
    private readonly subject: string;

    private readonly passwordExpiredIn: number;
    private readonly passwordSaltLength: number;

    private readonly passwordAttempt: boolean;
    private readonly maxPasswordAttempt: number;

    constructor(
        private readonly helperHashService: HelperHashService,
        private readonly helperDateService: HelperDateService,
        private readonly helperStringService: HelperStringService,
        private readonly helperEncryptionService: HelperEncryptionService,
        private readonly helperGoogleService: HelperGoogleService,
        private readonly helperAppleService: HelperAppleService,
        private readonly configService: ConfigService
    ) {
        this.accessTokenSecretKey = this.configService.get<string>(
            'auth.accessToken.secretKey'
        );
        this.accessTokenExpirationTime = this.configService.get<number>(
            'auth.accessToken.expirationTime'
        );

        this.refreshTokenSecretKey = this.configService.get<string>(
            'auth.refreshToken.secretKey'
        );
        this.refreshTokenExpirationTime = this.configService.get<number>(
            'auth.refreshToken.expirationTime'
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

        this.passwordAttempt = this.configService.get<boolean>(
            'auth.password.attempt'
        );
        this.maxPasswordAttempt = this.configService.get<number>(
            'auth.password.maxAttempt'
        );
    }

    async createAccessToken(payload: AuthJwtAccessPayloadDto): Promise<string> {
        return this.helperEncryptionService.jwtEncrypt(
            { data: payload },
            {
                secretKey: this.accessTokenSecretKey,
                expiredIn: this.accessTokenExpirationTime,
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
                secretKey: this.refreshTokenSecretKey,
                expiredIn: this.refreshTokenExpirationTime,
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
        user: AuthJwtAccessPayloadUserDto,
        { loginFrom, loginDate }: IAuthPayloadOptions
    ): Promise<AuthJwtAccessPayloadDto> {
        return {
            ...user,
            loginFrom,
            loginDate,
        } as AuthJwtAccessPayloadDto;
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
        return this.prefixAuthorization;
    }

    async getAccessTokenExpirationTime(): Promise<number> {
        return this.accessTokenExpirationTime;
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

    async googleGetTokenInfo(
        accessToken: string
    ): Promise<IHelperGooglePayload> {
        return this.helperGoogleService.getTokenInfo(accessToken);
    }

    async appleGetTokenInfo(accessToken: string): Promise<IHelperApplePayload> {
        return this.helperAppleService.getTokenInfo(accessToken);
    }

    async getPasswordAttempt(): Promise<boolean> {
        return this.passwordAttempt;
    }

    async getMaxPasswordAttempt(): Promise<number> {
        return this.maxPasswordAttempt;
    }
}
