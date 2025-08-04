import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import verifyAppleToken from 'verify-apple-id-token';
import { LoginTicket, OAuth2Client, TokenPayload } from 'google-auth-library';
import { Algorithm } from 'jsonwebtoken';
import {
    IAuthJwtAccessTokenPayload,
    IAuthJwtRefreshTokenPayload,
    IAuthPassword,
    IAuthPasswordOptions,
    IAuthSocialPayload,
} from '@modules/auth/interfaces/auth.interface';
import { ENUM_AUTH_LOGIN_FROM } from '@modules/auth/enums/auth.enum';
import { readFileSync } from 'fs';
import { JwtService, JwtSignOptions } from '@nestjs/jwt';
import { join } from 'path';
import { IAuthService } from '@modules/auth/interfaces/auth.service.interface';
import { HelperService } from '@common/helper/services/helper.service';
import { AuthTokenResponseDto } from '@modules/auth/dtos/response/auth.token.response.dto';

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
        private readonly helperService: HelperService,
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

    payloadToken<T>(token: string): T {
        return this.jwtService.decode<T>(token);
    }

    createPayloadAccessToken(
        data: any, // TODO: CHANGE WITH USER DOC INTERFACE
        sessionId: string,
        loginDate: Date,
        loginFrom: ENUM_AUTH_LOGIN_FROM
    ): IAuthJwtAccessTokenPayload {
        return {
            userId: data.id,
            type: data.role.type,
            roleId: data.role.id,
            username: data.username,
            email: data.email,
            sessionId,
            termPolicy: {
                term: data.termPolicy.term,
                privacy: data.termPolicy.privacy,
                marketing: data.termPolicy.marketing,
                cookies: data.termPolicy.cookies,
            },
            verification: {
                email: data.verification.email,
                mobileNumber: data.verification.mobileNumber,
            },
            loginDate,
            loginFrom,
        };
    }

    createPayloadRefreshToken({
        sessionId,
        userId,
        loginFrom,
        loginDate,
    }: IAuthJwtAccessTokenPayload): IAuthJwtRefreshTokenPayload {
        return {
            loginDate,
            loginFrom,
            sessionId,
            userId,
        };
    }

    validatePassword(passwordString: string, passwordHash: string): boolean {
        return this.helperService.bcryptCompare(passwordString, passwordHash);
    }

    checkPasswordAttempt(
        user: any // TODO: CHANGE WITH USER DOC INTERFACE
    ): boolean {
        return this.passwordAttempt
            ? user.passwordAttempt > this.passwordMaxAttempt
            : false;
    }

    createPassword(
        password: string,
        options?: IAuthPasswordOptions
    ): IAuthPassword {
        const today = this.helperService.dateCreate();
        const salt: string = this.helperService.bcryptGenerateSalt(
            this.passwordSaltLength
        );
        const passwordExpired: Date = this.helperService.dateForward(
            today,
            this.helperService.dateCreateDuration({
                seconds: options?.temporary
                    ? this.passwordExpiredTemporary
                    : this.passwordExpiredIn,
            })
        );
        const passwordHash = this.helperService.bcryptHash(password, salt);

        return {
            passwordHash,
            passwordExpired,
            passwordCreated: today,
            salt,
        };
    }

    createPasswordRandom(): string {
        return this.helperService.randomString(10);
    }

    checkPasswordExpired(passwordExpired: Date): boolean {
        const today: Date = this.helperService.dateCreate();
        return today > passwordExpired;
    }

    createTokens(
        user: any, // TODO: CHANGE WITH USER DOC INTERFACE
        sessionId: string
    ): AuthTokenResponseDto {
        const loginDate = this.helperService.dateCreate();
        const roleType = user.role.type;

        const payloadAccessToken: IAuthJwtAccessTokenPayload =
            this.createPayloadAccessToken(
                user,
                sessionId,
                loginDate,
                ENUM_AUTH_LOGIN_FROM.CREDENTIAL
            );
        const accessToken: string = this.createAccessToken(
            user.id,
            payloadAccessToken
        );

        const payloadRefreshToken: IAuthJwtRefreshTokenPayload =
            this.createPayloadRefreshToken(payloadAccessToken);
        const refreshToken: string = this.createRefreshToken(
            user.id,
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
        user: any, // TODO: CHANGE WITH USER DOC INTERFACE
        refreshTokenFromRequest: string
    ): AuthTokenResponseDto {
        const roleType = user.role.type;

        const payloadRefreshToken =
            this.payloadToken<IAuthJwtRefreshTokenPayload>(
                refreshTokenFromRequest
            );

        const payloadAccessToken: IAuthJwtAccessTokenPayload =
            this.createPayloadAccessToken(
                user,
                payloadRefreshToken.sessionId,
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

    async appleGetTokenInfo(token: string): Promise<IAuthSocialPayload> {
        const payload = await verifyAppleToken({
            idToken: token,
            clientId: [this.appleClientId, this.appleSignInClientId],
        });

        return { email: payload.email, emailVerified: payload.email_verified };
    }

    async googleGetTokenInfo(idToken: string): Promise<IAuthSocialPayload> {
        const login: LoginTicket = await this.googleClient.verifyIdToken({
            idToken: idToken,
        });
        const payload: TokenPayload = login.getPayload();

        return {
            email: payload.email,
            emailVerified: true,
        };
    }
}
