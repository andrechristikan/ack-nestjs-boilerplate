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
} from '@prisma/client';
import { createPrivateKey, createPublicKey } from 'crypto';
import verifyAppleToken, {
    VerifyAppleIdTokenResponse,
} from 'verify-apple-id-token';
import { IRequestApp } from '@common/request/interfaces/request.interface';
import { IUser } from '@modules/user/interfaces/user.interface';
import { DatabaseUtil } from '@common/database/utils/database.util';
import { AuthTokenResponseDto } from '@modules/auth/dtos/response/auth.token.response.dto';

/**
 * Authentication Utility Service.
 * Handles JWT tokens, password operations, and social authentication (Google, Apple).
 * See documentation: docs/authentication.md
 */
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
        );
        this.jwtAccessTokenExpirationTimeInSeconds =
            this.configService.get<number>(
                'auth.jwt.accessToken.expirationTimeInSeconds'
            );
        this.jwtRefreshTokenKid = this.configService.get<string>(
            'auth.jwt.refreshToken.kid'
        );
        this.jwtRefreshTokenExpirationTimeInSeconds =
            this.configService.get<number>(
                'auth.jwt.refreshToken.expirationTimeInSeconds'
            );

        const jwtAccessTokenPrivateKeyBuffer = Buffer.from(
            this.configService.get<string>('auth.jwt.accessToken.privateKey'),
            'base64'
        );
        this.jwtAccessTokenPrivateKey = createPrivateKey({
            key: jwtAccessTokenPrivateKeyBuffer,
            format: 'der',
            type: 'pkcs8',
        }).export({ type: 'pkcs8', format: 'pem' }) as string;
        const jwtAccessTokenPublicKeyBuffer = Buffer.from(
            this.configService.get<string>('auth.jwt.accessToken.publicKey'),
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
        );

        const jwtRefreshTokenPrivateKeyBuffer = Buffer.from(
            this.configService.get<string>('auth.jwt.refreshToken.privateKey'),
            'base64'
        );
        this.jwtRefreshTokenPrivateKey = createPrivateKey({
            key: jwtRefreshTokenPrivateKeyBuffer,
            format: 'der',
            type: 'pkcs8',
        }).export({ type: 'pkcs8', format: 'pem' }) as string;
        const jwtRefreshTokenPublicKeyBuffer = Buffer.from(
            this.configService.get<string>('auth.jwt.refreshToken.publicKey'),
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
        );

        this.jwtPrefix = this.configService.get<string>('auth.jwt.prefix');
        this.jwtAudience = this.configService.get<string>('auth.jwt.audience');
        this.jwtIssuer = this.configService.get<string>('auth.jwt.issuer');
        this.jwtHeader = this.configService.get<string>('auth.jwt.header');

        this.appleHeader = this.configService.get<string>('auth.apple.header');
        this.applePrefix = this.configService.get<string>('auth.apple.prefix');

        this.googleHeader =
            this.configService.get<string>('auth.google.header');
        this.googlePrefix =
            this.configService.get<string>('auth.google.prefix');

        // password
        this.passwordExpiredInSeconds = this.configService.get<number>(
            'auth.password.expiredInSeconds'
        );
        this.passwordExpiredTemporaryInSeconds = this.configService.get<number>(
            'auth.password.expiredTemporaryInSeconds'
        );
        this.passwordSaltLength = this.configService.get<number>(
            'auth.password.saltLength'
        );
        this.passwordPeriodInSeconds = this.configService.get<number>(
            'auth.password.periodInSeconds'
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

    /**
     * Creates a JWT access token with the given subject and payload.
     * @param subject - The subject identifier (user ID)
     * @param jti - The unique token identifier
     * @param payload - The token payload data
     * @returns The signed JWT access token
     */
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

    /**
     * Creates a JWT refresh token with the given subject and payload.
     * @param subject - The subject identifier (user ID)
     * @param jti - The unique token identifier
     * @param payload - The refresh token payload
     * @param expiresIn - Optional custom expiration time in seconds
     * @returns The signed JWT refresh token
     */
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

    /**
     * Validates an access token signature and claims for the given subject.
     * @param subject - The subject identifier to validate
     * @param jti - The unique token identifier
     * @param token - The JWT access token
     * @returns True if token is valid
     */
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

    /**
     * Validates a refresh token signature and claims for the given subject.
     * @param subject - The subject identifier to validate
     * @param jti - The unique token identifier
     * @param token - The JWT refresh token
     * @returns True if token is valid
     */
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

    /**
     * Decodes JWT payload without signature verification. WARNING: Use only on verified tokens.
     * @param token - The JWT token
     * @returns The decoded payload
     */
    payloadToken<T>(token: string): T {
        return this.jwtService.decode<T>(token);
    }

    /**
     * Creates access token payload from user and login data.
     * @param data - User entity
     * @param sessionId - Session identifier
     * @param loginAt - Login timestamp
     * @param loginFrom - Login source/platform
     * @param loginWith - Authentication method
     * @returns Formatted access token payload
     */
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

    /**
     * Creates refresh token payload from access token payload.
     * @param payload - Access token payload with sessionId, userId, loginFrom, loginAt, loginWith
     * @returns Minimal refresh token payload
     */
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

    /**
     * Validates password against bcrypt hash.
     * @param passwordString - Plain text password
     * @param passwordHash - Bcrypt hash to compare
     * @returns True if password matches
     */
    validatePassword(passwordString: string, passwordHash: string): boolean {
        return this.helperService.bcryptCompare(passwordString, passwordHash);
    }

    /**
     * Checks if user exceeded maximum password attempt limit.
     * @param user - User entity
     * @returns True if attempts exceeded limit
     */
    checkPasswordAttempt(user: User): boolean {
        return this.passwordAttempt
            ? user.passwordAttempt >= this.passwordMaxAttempt
            : false;
    }

    /**
     * Creates password hash with salt and expiration tracking.
     * @param userId - User identifier
     * @param password - Plain text password
     * @param options - Optional settings (temporary flag)
     * @returns Password object with hash, expiration, and encrypted password
     */
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

    /**
     * Encrypts password using AES-256 encryption with user ID as key.
     * Used for emergency password storage/recovery purposes.
     * @param userId - User identifier used as encryption key
     * @param password - Plain text password to encrypt
     * @returns AES-256 encrypted password
     */
    encryptPassword(userId: string, password: string): string {
        return this.helperService.aes256EncryptSimple(password, userId);
    }

    /**
     * Decrypts password using AES-256 decryption with user ID as key.
     * @param userId - User identifier used as decryption key
     * @param encrypted - AES-256 encrypted password
     * @returns Decrypted plain text password
     */
    decryptPassword(userId: string, encrypted: string): string {
        return this.helperService.aes256DecryptSimple(encrypted, userId);
    }

    /**
     * Generates a random 10-character alphanumeric password string.
     * @returns Random password
     */
    createPasswordRandom(): string {
        return this.helperService.randomString(10);
    }

    /**
     * Checks if password has expired.
     * @param passwordExpired - Optional password expiration date
     * @returns True if password expired
     */
    checkPasswordExpired(passwordExpired?: Date): boolean {
        if (!passwordExpired) {
            return false;
        }

        const today: Date = this.helperService.dateCreate();
        return today > passwordExpired;
    }

    /**
     * Extracts Google OAuth token from request headers.
     * @param request - HTTP request with Google OAuth headers
     * @returns Header split by prefix or empty array
     */
    extractHeaderGoogle(request: IRequestApp<IAuthSocialPayload>): string[] {
        return (
            (
                request.headers[`${this.googleHeader?.toLowerCase()}`] as string
            )?.split(`${this.googlePrefix} `) ?? []
        );
    }

    /**
     * Verifies Google OAuth ID token.
     * @param token - Google OAuth ID token
     * @returns Promise resolving to verified token payload
     */
    async verifyGoogle(token: string): Promise<TokenPayload> {
        const login: LoginTicket = await this.googleClient.verifyIdToken({
            idToken: token,
        });

        const payload: TokenPayload = login.getPayload();

        return payload;
    }

    /**
     * Extracts Apple Sign-In token from request headers.
     * @param request - HTTP request with Apple Sign-In headers
     * @returns Header split by prefix or empty array
     */
    extractHeaderApple(request: IRequestApp<IAuthSocialPayload>): string[] {
        return (
            (
                request.headers[`${this.appleHeader?.toLowerCase()}`] as string
            )?.split(`${this.applePrefix} `) ?? []
        );
    }

    /**
     * Verifies Apple Sign-In ID token.
     * @param token - Apple ID token
     * @returns Promise resolving to verified token response
     */
    async verifyApple(token: string): Promise<VerifyAppleIdTokenResponse> {
        return verifyAppleToken({
            idToken: token,
            clientId: [this.appleClientId, this.appleSignInClientId],
        });
    }

    /**
     * Generates a unique 32-character token identifier for session tracking.
     * @returns Random token identifier
     */
    generateJti(): string {
        return this.helperService.randomString(32);
    }

    /**
     * Extracts JWT token from request headers.
     * @param request - HTTP request with JWT headers
     * @returns Header split by prefix or empty array
     */
    extractHeaderJwt(request: IRequestApp): string[] {
        return (
            (
                request.headers[`${this.jwtHeader?.toLowerCase()}`] as string
            )?.split(`${this.jwtPrefix} `) ?? []
        );
    }

    /**
     * Creates access and refresh tokens for user session.
     * @param user - User entity
     * @param loginFrom - Login source/platform
     * @param loginWith - Authentication method
     * @returns Token response with access/refresh tokens, jti, and sessionId
     */
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

    /**
     * Refreshes access token using valid refresh token.
     * Validates refresh token, extracts session context, and generates new access token.
     * Maintains session continuity while issuing new access token with remaining refresh token validity.
     * @param user - User entity
     * @param refreshTokenFromRequest - Valid refresh token from client
     * @returns New tokens with new JTI, adjusted expiry time, and session metadata
     */
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
            oldExp * 1000
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

    /**
     * Checks if provided password matches any password in user's history.
     * Used to prevent reusing recent passwords during password change.
     * @param histories - Array of password history records (bcrypt hashed)
     * @param password - Plain text password to check against history
     * @returns Password history record if found, null if password is not in history
     */
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

    /**
     * Converts password period setting from seconds to days.
     * Used for display/UI purposes (e.g., "Password must not repeat for X days").
     * @returns Password period in days
     */
    getPasswordPeriodInDays(): number {
        return Math.floor(this.passwordPeriodInSeconds / (60 * 60 * 24));
    }
}
