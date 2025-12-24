import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { LoginTicket, OAuth2Client, TokenPayload } from 'google-auth-library';
import { Algorithm } from 'jsonwebtoken';
import {
    IAuthJwtAccessTokenPayload,
    IAuthJwtRefreshTokenPayload,
    IAuthPassword,
    IAuthPasswordOptions,
    IAuthSocialPayload,
} from '@modules/auth/interfaces/auth.interface';
import { JwtService, JwtSignOptions } from '@nestjs/jwt';
import { HelperService } from '@common/helper/services/helper.service';
import { EnumUserLoginFrom, EnumUserLoginWith, User } from '@prisma/client';
import { createPrivateKey, createPublicKey } from 'crypto';
import verifyAppleToken, {
    VerifyAppleIdTokenResponse,
} from 'verify-apple-id-token';
import { IRequestApp } from '@common/request/interfaces/request.interface';

/**
 * Authentication Utility Service
 *
 * Provides comprehensive authentication and authorization features including:
 * - JWT token management (access and refresh tokens) with ES512 algorithm
 * - Password operations (hashing, validation, expiration tracking)
 * - Social authentication integration (Google OAuth2, Apple Sign-In)
 *
 * All cryptographic operations use industry-standard algorithms and secure
 * configurations from the application's authentication configuration.
 */
@Injectable()
export class AuthUtil {
    // jwt
    private readonly jwtAccessTokenKid: string;
    private readonly jwtAccessTokenPrivateKey: string;
    private readonly jwtAccessTokenPublicKey: string;
    readonly jwtAccessTokenExpirationTimeInSeconds: number;
    private readonly jwtAccessTokenAlgorithm: Algorithm;

    private readonly jwtRefreshTokenKid: string;
    private readonly jwtRefreshTokenPrivateKey: string;
    private readonly jwtRefreshTokenPublicKey: string;
    readonly jwtRefreshTokenExpirationTimeInSeconds: number;
    private readonly jwtRefreshTokenAlgorithm: Algorithm;

    readonly jwtPrefix: string;
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
     * Creates a JWT access token for the given subject and payload.
     *
     * Generates a signed JWT token using the configured private key and ES512 algorithm.
     * The token includes issuer, audience, and expiration claims based on configuration.
     *
     * @param subject - The unique subject identifier for the token (typically user ID)
     * @param jti - The unique token identifier for security tracking and validation
     * @param payload - The payload data to include in the token
     * @returns The signed JWT access token string
     * @throws {Error} When token signing fails
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
     * Creates a JWT refresh token for the given subject and payload.
     *
     * Generates a signed JWT token using the configured private key and ES512 algorithm.
     * Allows optional custom expiration time; defaults to configuration value if not provided.
     *
     * @param subject - The unique subject identifier for the token (typically user ID)
     * @param jti - The unique token identifier for security tracking and validation
     * @param payload - The refresh token payload data to include in the token
     * @param expiresIn - Optional custom expiration time in seconds. Uses default from configuration if not provided
     * @returns The signed JWT refresh token string
     * @throws {Error} When token signing fails
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
     * Validates an access token for the given subject.
     *
     * Verifies the token signature using the configured public key and validates all claims
     * including expiration, audience, issuer, subject, and token identifier (jti).
     *
     * @param subject - The subject identifier to validate against
     * @param jti - The unique token identifier to validate
     * @param token - The JWT access token to validate
     * @returns True if the token is valid and all claims match, false otherwise
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
     * Validates a refresh token for the given subject.
     *
     * Verifies the token signature using the configured public key and validates all claims
     * including expiration, audience, issuer, subject, and token identifier (jti).
     *
     * @param subject - The subject identifier to validate against
     * @param jti - The unique token identifier to validate
     * @param token - The JWT refresh token to validate
     * @returns True if the token is valid and all claims match, false otherwise
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
     * Decodes and returns the payload from a JWT token without verification.
     *
     * WARNING: This method does not validate the token signature, expiration, or any claims.
     * Use only for extracting payload information when you don't need validation.
     * Always verify tokens using validateAccessToken() or validateRefreshToken() before trusting the data.
     *
     * @param token - The JWT token to decode
     * @returns The decoded payload of generic type T
     */
    payloadToken<T>(token: string): T {
        return this.jwtService.decode<T>(token);
    }

    /**
     * Creates the payload for an access token from user data and login information.
     *
     * Constructs a structured payload containing user identification, role information,
     * and session tracking data to be embedded in the JWT access token.
     *
     * @param data - The user entity from database containing profile and role information
     * @param sessionId - The unique session identifier for this login session
     * @param loginAt - The date and time when the login occurred
     * @param loginFrom - The source/platform of the login (e.g., website, mobile app)
     * @param loginWith - The authentication method used (email, google, apple, etc.)
     * @returns The formatted access token payload containing user and session data
     */
    createPayloadAccessToken(
        data: User,
        sessionId: string,
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
            loginAt,
            loginFrom,
            loginWith,
        };
    }

    /**
     * Creates a refresh token payload from an access token payload.
     *
     * Extracts only the essential fields from the access token payload needed for
     * token refresh operations, following the principle of least privilege.
     *
     * @param payload - The access token payload containing session and user information
     * @param payload.sessionId - The unique session identifier
     * @param payload.userId - The user's unique identifier
     * @param payload.loginFrom - The source/platform of the login
     * @param payload.loginAt - The date and time when the login occurred
     * @param payload.loginWith - The authentication method used
     * @returns The formatted refresh token payload with minimal required data for token refresh
     */
    createPayloadRefreshToken({
        sessionId,
        userId,
        loginFrom,
        loginAt,
        loginWith,
    }: IAuthJwtAccessTokenPayload): IAuthJwtRefreshTokenPayload {
        return {
            loginAt,
            loginFrom,
            loginWith,
            sessionId,
            userId,
        };
    }

    /**
     * Validates a password by comparing it with the stored hash using bcrypt.
     *
     * Uses the bcrypt algorithm for secure password comparison, defending against
     * timing attacks through constant-time comparison.
     *
     * @param passwordString - The plain text password to validate
     * @param passwordHash - The bcrypt hashed password to compare against
     * @returns True if the password matches the hash, false otherwise
     */
    validatePassword(passwordString: string, passwordHash: string): boolean {
        return this.helperService.bcryptCompare(passwordString, passwordHash);
    }

    /**
     * Checks if a user has exceeded the maximum password attempt limit.
     *
     * Validates whether the user's failed login attempts have exceeded the configured
     * maximum. Returns false if password attempt checking is disabled in configuration.
     *
     * @param user - The user entity containing password attempt information
     * @returns True if password attempts exceeded the configured limit, false if within limit or checking disabled
     */
    checkPasswordAttempt(user: User): boolean {
        return this.passwordAttempt
            ? user.passwordAttempt >= this.passwordMaxAttempt
            : false;
    }

    /**
     * Creates a new password hash with salt and expiration tracking.
     *
     * Generates a bcrypt hash with random salt and sets both regular and period expiration dates.
     * Supports temporary passwords with shorter expiration times for password reset scenarios.
     *
     * @param password - The plain text password to hash
     * @param options - Optional settings for password creation
     * @param options.temporary - If true, uses temporary password expiration time instead of regular expiration
     * @returns Object containing the password hash, creation date, expiration date, and period expiration date
     */
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

        return {
            passwordHash,
            passwordExpired,
            passwordCreated: today,
            passwordPeriodExpired,
        };
    }

    /**
     * Generates a random password string.
     *
     * Creates a cryptographically random 10-character alphanumeric string suitable
     * for temporary passwords or password reset scenarios.
     *
     * @returns A randomly generated 10-character alphanumeric password string
     */
    createPasswordRandom(): string {
        return this.helperService.randomString(10);
    }

    /**
     * Checks if a password has expired based on its expiration date.
     *
     * Compares the password expiration date with the current date to determine
     * if the user should be prompted to change their password.
     *
     * @param passwordExpired - The date when the password expires
     * @returns True if the password has expired (current date > expiration date), false otherwise
     */
    checkPasswordExpired(passwordExpired: Date): boolean {
        const today: Date = this.helperService.dateCreate();
        return today > passwordExpired;
    }

    /**
     * Extracts Google OAuth token from request headers.
     *
     * Looks for the configured Google header name and splits the header value
     * by the configured prefix (typically 'Bearer ') to extract the token.
     *
     * @param request - The incoming HTTP request containing Google OAuth headers
     * @returns Array of strings from the header split by prefix, or empty array if header not found
     */
    extractHeaderGoogle(request: IRequestApp<IAuthSocialPayload>): string[] {
        return (
            (
                request.headers[`${this.googleHeader?.toLowerCase()}`] as string
            )?.split(`${this.googlePrefix} `) ?? []
        );
    }

    /**
     * Verifies a Google OAuth ID token and extracts the payload.
     *
     * Validates the token signature against Google's public keys and verifies all claims.
     * Extracts the decoded payload containing user information if verification succeeds.
     *
     * @param token - The Google OAuth ID token to verify
     * @returns Promise resolving to the verified token payload containing user information
     * @throws {Error} When token verification fails, token is invalid, expired, or signature is invalid
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
     *
     * Looks for the configured Apple header name and splits the header value
     * by the configured prefix (typically 'Bearer ') to extract the token.
     *
     * @param request - The incoming HTTP request containing Apple Sign-In headers
     * @returns Array of strings from the header split by prefix, or empty array if header not found
     */
    extractHeaderApple(request: IRequestApp<IAuthSocialPayload>): string[] {
        return (
            (
                request.headers[`${this.appleHeader?.toLowerCase()}`] as string
            )?.split(`${this.applePrefix} `) ?? []
        );
    }

    /**
     * Verifies an Apple Sign-In ID token and extracts the payload.
     *
     * Validates the token signature against Apple's public keys and verifies all claims.
     * Supports both regular Apple ID and Sign-In with Apple client IDs for compatibility.
     * Extracts the decoded payload containing user information if verification succeeds.
     *
     * @param token - The Apple ID token to verify
     * @returns Promise resolving to the verified token response containing user information
     * @throws {Error} When token verification fails, token is invalid, expired, or signature is invalid
     */
    async verifyApple(token: string): Promise<VerifyAppleIdTokenResponse> {
        return verifyAppleToken({
            idToken: token,
            clientId: [this.appleClientId, this.appleSignInClientId],
        });
    }

    /**
     * Generates a unique token identifier for session tracking.
     *
     * Creates a 32-character random string used to track unique sessions or devices
     * and provide additional security validation during token verification.
     *
     * @returns A 32-character random alphanumeric string
     */
    generateJti(): string {
        return this.helperService.randomString(32);
    }

    /**
     * Extracts JWT token from request headers.
     *
     * Looks for the configured JWT header name and splits the header value
     * by the configured prefix (typically 'Bearer ') to extract the token.
     *
     * @param request - The incoming HTTP request containing JWT headers
     * @returns Array of strings from the header split by prefix, or empty array if header not found
     */
    extractHeaderJwt(request: IRequestApp): string[] {
        return (
            (
                request.headers[`${this.jwtHeader?.toLowerCase()}`] as string
            )?.split(`${this.jwtPrefix} `) ?? []
        );
    }
}
