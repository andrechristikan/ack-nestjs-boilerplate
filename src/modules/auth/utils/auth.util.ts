import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { LoginTicket, OAuth2Client, TokenPayload } from 'google-auth-library';
import { Algorithm } from 'jsonwebtoken';
import {
    IAuthAccessTokenGenerate,
    IAuthJwtAccessTokenPayload,
    IAuthJwtRefreshTokenPayload,
    IAuthPassword,
    IAuthPasswordOptions,
    IAuthRefreshTokenGenerate,
    IAuthSocialPayload,
} from '@modules/auth/interfaces/auth.interface';
import { JwtService, JwtSignOptions } from '@nestjs/jwt';
import { HelperService } from '@common/helper/services/helper.service';
import {
    EnumUserLoginFrom,
    EnumUserLoginWith,
    PasswordHistory,
    User,
} from '@generated/prisma-client';
import { createPrivateKey, createPublicKey } from 'crypto';
import verifyAppleToken, {
    VerifyAppleIdTokenResponse,
} from 'verify-apple-id-token';
import { IRequestApp } from '@common/request/interfaces/request.interface';
import { IUser } from '@modules/user/interfaces/user.interface';
import { DatabaseUtil } from '@common/database/utils/database.util';
import { AuthTokenResponseDto } from '@modules/auth/dtos/response/auth.token.response.dto';

/** Auth utility: JWT signing/verification, password hashing, and social token verification. See docs/authentication.md. */
@Injectable()
export class AuthUtil {
    // jwt
    private readonly jwtAccessTokenKid: string;
    private readonly jwtAccessTokenPrivateKey: string;
    private readonly jwtAccessTokenPublicKey: string;
    private readonly jwtAccessTokenExpirationTimeInSeconds: number;
    private readonly jwtAccessTokenAlgorithm: Algorithm;

    private readonly jwtRefreshTokenKid: string;
    private readonly jwtRefreshTokenPrivateKey: string;
    private readonly jwtRefreshTokenPublicKey: string;
    readonly jwtRefreshTokenExpirationTimeInSeconds: number;
    private readonly jwtRefreshTokenAlgorithm: Algorithm;

    private readonly jwtPrefix: string;
    private readonly jwtAudience: string;
    private readonly jwtIssuer: string;
    private readonly jwtHeader: string;

    // apple
    private readonly appleHeader: string;
    private readonly applePrefix: string;

    // google
    private readonly googleHeader: string;
    private readonly googlePrefix: string;

    // password
    private readonly passwordExpiredInSeconds: number;
    private readonly passwordExpiredTemporaryInSeconds: number;
    private readonly passwordSaltLength: number;
    private readonly passwordPeriodInSeconds: number;
    private readonly passwordAttempt: boolean;
    private readonly passwordMaxAttempt: number;

    // apple
    private readonly appleClientId: string;
    private readonly appleSignInClientId: string;

    // google
    private readonly googleClient: OAuth2Client;

    constructor(
        private readonly databaseUtil: DatabaseUtil,
        private readonly helperService: HelperService,
        private readonly jwtService: JwtService,
        private readonly configService: ConfigService
    ) {
        this.jwtAccessTokenKid = this.configService.get<string>(
            'auth.jwt.accessToken.kid'
        )!;
        this.jwtAccessTokenExpirationTimeInSeconds =
            this.configService.get<number>(
                'auth.jwt.accessToken.expirationTimeInSeconds'
            )!;
        this.jwtRefreshTokenKid = this.configService.get<string>(
            'auth.jwt.refreshToken.kid'
        )!;
        this.jwtRefreshTokenExpirationTimeInSeconds =
            this.configService.get<number>(
                'auth.jwt.refreshToken.expirationTimeInSeconds'
            )!;

        const jwtAccessTokenPrivateKeyBuffer = Buffer.from(
            this.configService.get<string>('auth.jwt.accessToken.privateKey')!,
            'base64'
        );
        this.jwtAccessTokenPrivateKey = createPrivateKey({
            key: jwtAccessTokenPrivateKeyBuffer,
            format: 'der',
            type: 'pkcs8',
        }).export({ type: 'pkcs8', format: 'pem' }) as string;
        const jwtAccessTokenPublicKeyBuffer = Buffer.from(
            this.configService.get<string>('auth.jwt.accessToken.publicKey')!,
            'base64'
        );
        this.jwtAccessTokenPublicKey = createPublicKey({
            key: jwtAccessTokenPublicKeyBuffer,
            format: 'der',
            type: 'spki',
        }).export({
            type: 'spki',
            format: 'pem',
        }) as string;
        this.jwtAccessTokenAlgorithm = this.configService.get<Algorithm>(
            'auth.jwt.accessToken.algorithm'
        )!;

        const jwtRefreshTokenPrivateKeyBuffer = Buffer.from(
            this.configService.get<string>('auth.jwt.refreshToken.privateKey')!,
            'base64'
        );
        this.jwtRefreshTokenPrivateKey = createPrivateKey({
            key: jwtRefreshTokenPrivateKeyBuffer,
            format: 'der',
            type: 'pkcs8',
        }).export({ type: 'pkcs8', format: 'pem' }) as string;
        const jwtRefreshTokenPublicKeyBuffer = Buffer.from(
            this.configService.get<string>('auth.jwt.refreshToken.publicKey')!,
            'base64'
        );
        this.jwtRefreshTokenPublicKey = createPublicKey({
            key: jwtRefreshTokenPublicKeyBuffer,
            format: 'der',
            type: 'spki',
        }).export({
            type: 'spki',
            format: 'pem',
        }) as string;
        this.jwtRefreshTokenAlgorithm = this.configService.get<Algorithm>(
            'auth.jwt.refreshToken.algorithm'
        )!;

        this.jwtPrefix = this.configService.get<string>('auth.jwt.prefix')!;
        this.jwtAudience = this.configService.get<string>('auth.jwt.audience')!;
        this.jwtIssuer = this.configService.get<string>('auth.jwt.issuer')!;
        this.jwtHeader = this.configService.get<string>('auth.jwt.header')!;

        this.appleHeader = this.configService.get<string>('auth.apple.header')!;
        this.applePrefix = this.configService.get<string>('auth.apple.prefix')!;

        this.googleHeader =
            this.configService.get<string>('auth.google.header')!;
        this.googlePrefix =
            this.configService.get<string>('auth.google.prefix')!;

        // password
        this.passwordExpiredInSeconds = this.configService.get<number>(
            'auth.password.expiredInSeconds'
        )!;
        this.passwordExpiredTemporaryInSeconds = this.configService.get<number>(
            'auth.password.expiredTemporaryInSeconds'
        )!;
        this.passwordSaltLength = this.configService.get<number>(
            'auth.password.saltLength'
        )!;
        this.passwordPeriodInSeconds = this.configService.get<number>(
            'auth.password.periodInSeconds'
        )!;
        this.passwordAttempt = this.configService.get<boolean>(
            'auth.password.attempt'
        )!;
        this.passwordMaxAttempt = this.configService.get<number>(
            'auth.password.maxAttempt'
        )!;

        // apple
        this.appleClientId = this.configService.get<string>(
            'auth.apple.clientId'
        )!;
        this.appleSignInClientId = this.configService.get<string>(
            'auth.apple.signInClientId'
        )!;

        // google
        this.googleClient = new OAuth2Client(
            this.configService.get<string>('auth.google.clientId')!,
            this.configService.get<string>('auth.google.clientSecret')!
        );
    }

    /** Signs an access token with the access private key and configured algorithm. */
    createAccessToken(
        subject: string,
        jti: string,
        payload: IAuthJwtAccessTokenPayload
    ): string {
        return this.jwtService.sign(payload, {
            privateKey: this.jwtAccessTokenPrivateKey,
            expiresIn: this.jwtAccessTokenExpirationTimeInSeconds,
            audience: this.jwtAudience,
            issuer: this.jwtIssuer,
            subject,
            algorithm: this.jwtAccessTokenAlgorithm,
            keyid: this.jwtAccessTokenKid,
            jwtid: jti,
        } as JwtSignOptions);
    }

    /** Signs a refresh token with the refresh private key; expiresIn overrides the configured default. */
    createRefreshToken(
        subject: string,
        jti: string,
        payload: IAuthJwtRefreshTokenPayload,
        expiresIn?: number
    ): string {
        return this.jwtService.sign(payload, {
            privateKey: this.jwtRefreshTokenPrivateKey,
            expiresIn: expiresIn ?? this.jwtRefreshTokenExpirationTimeInSeconds,
            audience: this.jwtAudience,
            issuer: this.jwtIssuer,
            subject,
            algorithm: this.jwtRefreshTokenAlgorithm,
            keyid: this.jwtRefreshTokenKid,
            jwtid: jti,
        } as JwtSignOptions);
    }

    /** Verifies an access token's signature and claims against the access public key. */
    validateAccessToken(subject: string, jti: string, token: string): boolean {
        try {
            this.jwtService.verify(token, {
                publicKey: this.jwtAccessTokenPublicKey,
                algorithms: [this.jwtAccessTokenAlgorithm],
                audience: this.jwtAudience,
                issuer: this.jwtIssuer,
                subject,
                jwtid: jti,
            });

            return true;
        } catch {
            return false;
        }
    }

    /** Verifies a refresh token's signature and claims against the refresh public key. */
    validateRefreshToken(subject: string, jti: string, token: string): boolean {
        try {
            this.jwtService.verify(token, {
                publicKey: this.jwtRefreshTokenPublicKey,
                algorithms: [this.jwtRefreshTokenAlgorithm],
                audience: this.jwtAudience,
                issuer: this.jwtIssuer,
                subject,
                jwtid: jti,
            });

            return true;
        } catch {
            return false;
        }
    }

    /** Decodes a JWT payload WITHOUT signature verification; use only on already-verified tokens. */
    payloadToken<T>(token: string): T {
        return this.jwtService.decode<T>(token);
    }

    /** Assembles the access token payload from the user and login context. */
    createPayloadAccessToken(
        data: User,
        sessionId: string,
        deviceOwnershipId: string,
        loginAt: Date,
        loginFrom: EnumUserLoginFrom,
        loginWith: EnumUserLoginWith
    ): IAuthJwtAccessTokenPayload {
        return {
            userId: data.id,
            roleId: data.roleId,
            username: data.username,
            email: data.email,
            sessionId,
            deviceOwnershipId,
            loginAt,
            loginFrom,
            loginWith,
        };
    }

    /** Derives the minimal refresh token payload from an access token payload. */
    createPayloadRefreshToken({
        sessionId,
        userId,
        deviceOwnershipId,
        loginFrom,
        loginAt,
        loginWith,
    }: IAuthJwtAccessTokenPayload): IAuthJwtRefreshTokenPayload {
        return {
            loginAt,
            loginFrom,
            loginWith,
            sessionId,
            deviceOwnershipId,
            userId,
        };
    }

    /** Compares a plain password against its bcrypt hash. */
    validatePassword(passwordString: string, passwordHash: string): boolean {
        return this.helperService.bcryptCompare(passwordString, passwordHash);
    }

    /** True when the user exceeded the max password attempts; always false if attempt tracking is off. */
    checkPasswordAttempt(user: User): boolean {
        return this.passwordAttempt
            ? (user.passwordAttempt ?? 0) >= this.passwordMaxAttempt
            : false;
    }

    /** Builds the bcrypt hash plus expiry, period, and reversibly encrypted copy; temporary uses a shorter expiry. */
    createPassword(
        userId: string,
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
                    ? this.passwordExpiredTemporaryInSeconds
                    : this.passwordExpiredInSeconds,
            })
        );
        const passwordHash = this.helperService.bcryptHash(password, salt);
        const passwordPeriodExpired: Date = this.helperService.dateForward(
            today,
            this.helperService.dateCreateDuration({
                seconds: this.passwordPeriodInSeconds,
            })
        );
        const passwordEncrypted: string = this.encryptPassword(
            userId,
            password
        );

        return {
            passwordHash,
            passwordExpired,
            passwordCreated: today,
            passwordPeriodExpired,
            passwordEncrypted,
        };
    }

    /** Reversibly encrypts the password (AES-256, keyed by user ID) for recovery purposes. */
    encryptPassword(userId: string, password: string): string {
        return this.helperService.aes256EncryptSimple(password, userId);
    }

    /** Decrypts the AES-256 encrypted password keyed by user ID. */
    decryptPassword(userId: string, encrypted: string): string {
        return this.helperService.aes256DecryptSimple(encrypted, userId);
    }

    createPasswordRandom(): string {
        return this.helperService.randomString(10);
    }

    /** True when the expiry date has passed; false when no expiry is set. */
    checkPasswordExpired(passwordExpired?: Date | null): boolean {
        if (!passwordExpired) {
            return false;
        }

        const today: Date = this.helperService.dateCreate();
        return today > passwordExpired;
    }

    /** Splits the configured Google header by its prefix; returns an empty array when absent. */
    extractHeaderGoogle(request: IRequestApp<IAuthSocialPayload>): string[] {
        return (
            (
                request.headers[`${this.googleHeader?.toLowerCase()}`] as string
            )?.split(`${this.googlePrefix} `) ?? []
        );
    }

    /** Verifies a Google ID token via the OAuth2 client and returns its payload. */
    async verifyGoogle(token: string): Promise<TokenPayload> {
        const login: LoginTicket = await this.googleClient.verifyIdToken({
            idToken: token,
        });

        const payload = login.getPayload();

        return payload as TokenPayload;
    }

    /** Splits the configured Apple header by its prefix; returns an empty array when absent. */
    extractHeaderApple(request: IRequestApp<IAuthSocialPayload>): string[] {
        return (
            (
                request.headers[`${this.appleHeader?.toLowerCase()}`] as string
            )?.split(`${this.applePrefix} `) ?? []
        );
    }

    /** Verifies an Apple ID token against both the app and sign-in client IDs. */
    async verifyApple(token: string): Promise<VerifyAppleIdTokenResponse> {
        return verifyAppleToken({
            idToken: token,
            clientId: [this.appleClientId, this.appleSignInClientId],
        });
    }

    /** Generates a random 32-character jti used to bind a token to its session. */
    generateJti(): string {
        return this.helperService.randomString(32);
    }

    /** Splits the configured JWT header by its prefix; returns an empty array when absent. */
    extractHeaderJwt(request: IRequestApp): string[] {
        return (
            (
                request.headers[`${this.jwtHeader?.toLowerCase()}`] as string
            )?.split(`${this.jwtPrefix} `) ?? []
        );
    }

    /** Issues a fresh access/refresh token pair sharing one jti and a new session id. */
    createTokens(
        user: IUser,
        loginFrom: EnumUserLoginFrom,
        loginWith: EnumUserLoginWith
    ): IAuthAccessTokenGenerate {
        const loginDate = this.helperService.dateCreate();

        const sessionId = this.databaseUtil.createId();
        const deviceOwnershipId = this.databaseUtil.createId();
        const jti = this.generateJti();
        const payloadAccessToken: IAuthJwtAccessTokenPayload =
            this.createPayloadAccessToken(
                user,
                sessionId,
                deviceOwnershipId,
                loginDate,
                loginFrom,
                loginWith
            );
        const accessToken: string = this.createAccessToken(
            user.id,
            jti,
            payloadAccessToken
        );

        const payloadRefreshToken: IAuthJwtRefreshTokenPayload =
            this.createPayloadRefreshToken(payloadAccessToken);
        const refreshToken: string = this.createRefreshToken(
            user.id,
            jti,
            payloadRefreshToken
        );

        const tokens: AuthTokenResponseDto = {
            tokenType: this.jwtPrefix,
            roleType: user.role.type,
            expiresIn: this.jwtAccessTokenExpirationTimeInSeconds,
            accessToken,
            refreshToken,
        };

        return {
            tokens,
            jti,
            sessionId,
        };
    }

    /** Rotates the token pair with a new jti, reusing the session and capping the refresh expiry at the old token's remaining lifetime. */
    refreshToken(
        user: IUser,
        refreshTokenFromRequest: string
    ): IAuthRefreshTokenGenerate {
        const {
            deviceOwnershipId,
            sessionId,
            loginAt,
            loginFrom,
            loginWith,
            exp: oldExp,
        } = this.payloadToken<IAuthJwtRefreshTokenPayload>(
            refreshTokenFromRequest
        );

        const jti = this.generateJti();
        const payloadAccessToken: IAuthJwtAccessTokenPayload =
            this.createPayloadAccessToken(
                user,
                sessionId,
                deviceOwnershipId,
                loginAt,
                loginFrom,
                loginWith
            );
        const accessToken: string = this.createAccessToken(
            user.id,
            jti,
            payloadAccessToken
        );

        const newPayloadRefreshToken: IAuthJwtRefreshTokenPayload =
            this.createPayloadRefreshToken(payloadAccessToken);

        const today = this.helperService.dateCreate();
        const expiredAt = this.helperService.dateCreateFromTimestamp(
            (oldExp ?? 0) * 1000
        );

        const newRefreshTokenExpire = this.helperService.dateDiff(
            expiredAt,
            today
        );
        const newRefreshTokenExpireInSeconds = newRefreshTokenExpire.seconds
            ? newRefreshTokenExpire.seconds
            : Math.floor(newRefreshTokenExpire.milliseconds / 1000);

        const newRefreshToken: string = this.createRefreshToken(
            user.id,
            jti,
            newPayloadRefreshToken,
            newRefreshTokenExpireInSeconds
        );

        const tokens: AuthTokenResponseDto = {
            tokenType: this.jwtPrefix,
            roleType: user.role.type,
            expiresIn: this.jwtAccessTokenExpirationTimeInSeconds,
            accessToken,
            refreshToken: newRefreshToken,
        };

        return {
            tokens,
            jti,
            sessionId,
            expiredInMs: newRefreshTokenExpire.milliseconds,
        };
    }

    /** Returns the matching history record if the password was used before, blocking recent reuse. */
    checkPasswordPeriod(
        histories: PasswordHistory[],
        password: string
    ): PasswordHistory | null {
        for (const history of histories) {
            if (this.helperService.bcryptCompare(password, history.password)) {
                return history;
            }
        }

        return null;
    }

    /** Converts the configured password reuse period from seconds to whole days. */
    getPasswordPeriodInDays(): number {
        return Math.floor(this.passwordPeriodInSeconds / (60 * 60 * 24));
    }
}
