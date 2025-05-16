import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import verifyAppleToken from 'verify-apple-id-token';
import { LoginTicket, OAuth2Client, TokenPayload } from 'google-auth-library';
import { HelperDateService } from 'src/common/helper/services/helper.date.service';
import { Algorithm } from 'jsonwebtoken';
import { HelperHashService } from 'src/common/helper/services/helper.hash.service';
import { HelperStringService } from 'src/common/helper/services/helper.string.service';
import { IAuthService } from 'src/modules/auth/interfaces/auth.service.interface';
import {
    IAuthJwtAccessTokenPayload,
    IAuthJwtRefreshTokenPayload,
    IAuthPassword,
    IAuthPasswordOptions,
    IAuthSocialApplePayload,
    IAuthSocialGooglePayload,
} from 'src/modules/auth/interfaces/auth.interface';
import { ENUM_AUTH_LOGIN_FROM } from 'src/modules/auth/enums/auth.enum';
import { IUserDoc } from 'src/modules/user/interfaces/user.interface';
import { AuthLoginResponseDto } from 'src/modules/auth/dtos/response/auth.login.response.dto';
import { readFileSync } from 'fs';
import { JwtService, JwtSignOptions } from '@nestjs/jwt';
import { join } from 'path';

@Injectable()
export class AuthService implements IAuthService {
    // jwt
    private readonly jwtAccessTokenKid: string;
    private readonly jwtAccessTokenPrivateKey: string;
    private readonly jwtAccessTokenPublicKey: string;
    private readonly jwtAccessTokenExpirationTime: number;

    private readonly jwtRefreshTokenKid: string;
    private readonly jwtRefreshTokenPrivateKey: string;
    private readonly jwtRefreshTokenPublicKey: string;
    private readonly jwtRefreshTokenExpirationTime: number;

    private readonly jwtPrefix: string;
    private readonly jwtAudience: string;
    private readonly jwtIssuer: string;
    private readonly jwtAlgorithm: Algorithm;

    // password
    private readonly passwordExpiredIn: number;
    private readonly passwordExpiredTemporary: number;
    private readonly passwordSaltLength: number;

    private readonly passwordAttempt: boolean;
    private readonly passwordMaxAttempt: number;

    // apple
    private readonly appleClientId: string;
    private readonly appleSignInClientId: string;

    // google
    private readonly googleClient: OAuth2Client;

    constructor(
        private readonly helperHashService: HelperHashService,
        private readonly helperDateService: HelperDateService,
        private readonly helperStringService: HelperStringService,
        private readonly jwtService: JwtService,
        private readonly configService: ConfigService
    ) {
        this.jwtAccessTokenKid = this.configService.get<string>(
            'auth.jwt.accessToken.kid'
        );
        this.jwtAccessTokenPrivateKey = readFileSync(
            join(
                process.cwd(),
                this.configService.get<string>(
                    'auth.jwt.accessToken.privateKeyPath'
                )
            ),
            'utf8'
        );
        this.jwtAccessTokenPublicKey = readFileSync(
            join(
                process.cwd(),
                this.configService.get<string>(
                    'auth.jwt.accessToken.publicKeyPath'
                )
            ),
            'utf8'
        );
        this.jwtAccessTokenExpirationTime = this.configService.get<number>(
            'auth.jwt.accessToken.expirationTime'
        );

        this.jwtRefreshTokenKid = this.configService.get<string>(
            'auth.jwt.refreshToken.kid'
        );
        this.jwtRefreshTokenPrivateKey = readFileSync(
            join(
                process.cwd(),
                this.configService.get<string>(
                    'auth.jwt.refreshToken.privateKeyPath'
                )
            ),
            'utf8'
        );
        this.jwtRefreshTokenPublicKey = readFileSync(
            join(
                process.cwd(),
                this.configService.get<string>(
                    'auth.jwt.refreshToken.publicKeyPath'
                )
            ),
            'utf8'
        );
        this.jwtRefreshTokenExpirationTime = this.configService.get<number>(
            'auth.jwt.refreshToken.expirationTime'
        );

        this.jwtPrefix = this.configService.get<string>('auth.jwt.prefix');
        this.jwtAudience = this.configService.get<string>('auth.jwt.audience');
        this.jwtIssuer = this.configService.get<string>('auth.jwt.issuer');
        this.jwtAlgorithm =
            this.configService.get<Algorithm>('auth.jwt.algorithm');

        // password
        this.passwordExpiredIn = this.configService.get<number>(
            'auth.password.expiredIn'
        );
        this.passwordExpiredTemporary = this.configService.get<number>(
            'auth.password.expiredInTemporary'
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
        this.appleClientId = this.configService.get<string>(
            'auth.apple.clientId'
        );
        this.appleSignInClientId = this.configService.get<string>(
            'auth.apple.signInClientId'
        );

        // google
        this.googleClient = new OAuth2Client(
            this.configService.get<string>('auth.google.clientId'),
            this.configService.get<string>('auth.google.clientSecret')
        );
    }

    createAccessToken(
        subject: string,
        payload: IAuthJwtAccessTokenPayload
    ): string {
        return this.jwtService.sign(payload, {
            privateKey: this.jwtAccessTokenPrivateKey,
            expiresIn: this.jwtAccessTokenExpirationTime,
            audience: this.jwtAudience,
            issuer: this.jwtIssuer,
            subject,
            algorithm: this.jwtAlgorithm,
            keyid: this.jwtAccessTokenKid,
        } as JwtSignOptions);
    }

    validateAccessToken(subject: string, token: string): boolean {
        try {
            this.jwtService.verify(token, {
                publicKey: this.jwtAccessTokenPublicKey,
                algorithms: [this.jwtAlgorithm],
                audience: this.jwtAudience,
                issuer: this.jwtIssuer,
                subject,
            });

            return true;
        } catch {
            return false;
        }
    }

    payload<T = any>(token: string): T {
        return this.jwtService.decode<T>(token);
    }

    createRefreshToken(
        subject: string,
        payload: IAuthJwtRefreshTokenPayload
    ): string {
        return this.jwtService.sign(payload, {
            privateKey: this.jwtRefreshTokenPrivateKey,
            expiresIn: this.jwtRefreshTokenExpirationTime,
            audience: this.jwtAudience,
            issuer: this.jwtIssuer,
            subject,
            algorithm: this.jwtAlgorithm,
            keyid: this.jwtRefreshTokenKid,
        } as JwtSignOptions);
    }

    validateRefreshToken(subject: string, token: string): boolean {
        try {
            this.jwtService.verify(token, {
                publicKey: this.jwtRefreshTokenPublicKey,
                algorithms: [this.jwtAlgorithm],
                audience: this.jwtAudience,
                issuer: this.jwtIssuer,
                subject,
            });

            return true;
        } catch {
            return false;
        }
    }

    validateUser(passwordString: string, passwordHash: string): boolean {
        return this.helperHashService.bcryptCompare(
            passwordString,
            passwordHash
        );
    }

    createPayloadAccessToken(
        data: IUserDoc,
        session: string,
        loginDate: Date,
        loginFrom: ENUM_AUTH_LOGIN_FROM
    ): IAuthJwtAccessTokenPayload {
        return {
            user: data._id,
            type: data.role.type,
            role: data.role._id,
            email: data.email,
            session,
            loginDate,
            loginFrom,
        };
    }

    createPayloadRefreshToken({
        user,
        session,
        loginFrom,
        loginDate,
    }: IAuthJwtAccessTokenPayload): IAuthJwtRefreshTokenPayload {
        return {
            user,
            session,
            loginFrom,
            loginDate,
        };
    }

    createSalt(length: number): string {
        return this.helperHashService.randomSalt(length);
    }

    createPassword(
        password: string,
        options?: IAuthPasswordOptions
    ): IAuthPassword {
        const salt: string = this.createSalt(this.passwordSaltLength);

        const today = this.helperDateService.create();
        const passwordExpired: Date = this.helperDateService.forward(
            today,
            this.helperDateService.createDuration({
                seconds: options?.temporary
                    ? this.passwordExpiredTemporary
                    : this.passwordExpiredIn,
            })
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

    createPasswordRandom(): string {
        return this.helperStringService.random(10);
    }

    checkPasswordExpired(passwordExpired: Date): boolean {
        const today: Date = this.helperDateService.create();
        const passwordExpiredConvert: Date =
            this.helperDateService.create(passwordExpired);

        return today > passwordExpiredConvert;
    }

    createToken(user: IUserDoc, session: string): AuthLoginResponseDto {
        const loginDate = this.helperDateService.create();
        const roleType = user.role.type;

        const payloadAccessToken: IAuthJwtAccessTokenPayload =
            this.createPayloadAccessToken(
                user,
                session,
                loginDate,
                ENUM_AUTH_LOGIN_FROM.CREDENTIAL
            );
        const accessToken: string = this.createAccessToken(
            user._id,
            payloadAccessToken
        );

        const payloadRefreshToken: IAuthJwtRefreshTokenPayload =
            this.createPayloadRefreshToken(payloadAccessToken);
        const refreshToken: string = this.createRefreshToken(
            user._id,
            payloadRefreshToken
        );

        return {
            tokenType: this.jwtPrefix,
            roleType,
            expiresIn: this.jwtAccessTokenExpirationTime,
            accessToken,
            refreshToken,
        };
    }

    refreshToken(
        user: IUserDoc,
        refreshTokenFromRequest: string
    ): AuthLoginResponseDto {
        const roleType = user.role.type;

        const payloadRefreshToken = this.payload<IAuthJwtRefreshTokenPayload>(
            refreshTokenFromRequest
        );
        const payloadAccessToken: IAuthJwtAccessTokenPayload =
            this.createPayloadAccessToken(
                user,
                payloadRefreshToken.session,
                payloadRefreshToken.loginDate,
                payloadRefreshToken.loginFrom
            );
        const accessToken: string = this.createAccessToken(
            user._id,
            payloadAccessToken
        );

        return {
            tokenType: this.jwtPrefix,
            roleType,
            expiresIn: this.jwtAccessTokenExpirationTime,
            accessToken,
            refreshToken: refreshTokenFromRequest,
        };
    }

    getPasswordAttempt(): boolean {
        return this.passwordAttempt;
    }

    getPasswordMaxAttempt(): number {
        return this.passwordMaxAttempt;
    }

    async appleGetTokenInfo(idToken: string): Promise<IAuthSocialApplePayload> {
        const payload = await verifyAppleToken({
            idToken,
            clientId: [this.appleClientId, this.appleSignInClientId],
        });

        return { email: payload.email, emailVerified: payload.email_verified };
    }

    async googleGetTokenInfo(
        idToken: string
    ): Promise<IAuthSocialGooglePayload> {
        const login: LoginTicket = await this.googleClient.verifyIdToken({
            idToken: idToken,
        });
        const payload: TokenPayload = login.getPayload();

        return {
            email: payload.email,
            emailVerified: true,
            name: payload.name,
            photo: payload.picture,
        };
    }
}
