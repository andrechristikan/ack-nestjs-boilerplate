import { Injectable, UnauthorizedException } from '@nestjs/common';
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
import { JwtService, JwtSignOptions } from '@nestjs/jwt';
import { HelperService } from '@common/helper/services/helper.service';
import { AuthTokenResponseDto } from '@modules/auth/dtos/response/auth.token.response.dto';
import {
    ENUM_USER_LOGIN_FROM,
    ENUM_USER_SIGN_UP_WITH,
    User,
} from '@prisma/client';
import { ENUM_AUTH_STATUS_CODE_ERROR } from '@modules/auth/enums/auth.status-code.enum';
import { IRequestApp } from '@common/request/interfaces/request.interface';
import { IUser } from '@modules/user/interfaces/user.interface';
import { KeyObject, createPrivateKey } from 'crypto';

/**
 * Authentication util providing JWT token management, password operations,
 * and social authentication integration. Handles access and refresh token
 * generation, validation, and payload management for user authentication
 * across the application.
 */
@Injectable()
export class AuthUtil {
    // jwt
    private readonly jwtAccessTokenKid: string;
    private readonly jwtAccessTokenPrivateKey: KeyObject;
    private readonly jwtAccessTokenPublicKey: Buffer;
    private readonly jwtAccessTokenExpirationTimeInSeconds: number;
    private readonly jwtAccessTokenAlgorithm: Algorithm;

    private readonly jwtRefreshTokenKid: string;
    private readonly jwtRefreshTokenPrivateKey: KeyObject;
    private readonly jwtRefreshTokenPublicKey: Buffer;
    private readonly jwtRefreshTokenExpirationTimeInSeconds: number;
    private readonly jwtRefreshTokenAlgorithm: Algorithm;

    private readonly jwtPrefix: string;
    private readonly jwtAudience: string;
    private readonly jwtIssuer: string;

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
        });
        this.jwtAccessTokenPublicKey = Buffer.from(
            this.configService.get<string>('auth.jwt.accessToken.publicKey'),
            'base64'
        );
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
        });
        this.jwtRefreshTokenPublicKey = Buffer.from(
            this.configService.get<string>('auth.jwt.refreshToken.publicKey'),
            'base64'
        );
        this.jwtRefreshTokenAlgorithm = this.configService.get<Algorithm>(
            'auth.jwt.refreshToken.algorithm'
        );

        this.jwtPrefix = this.configService.get<string>('auth.jwt.prefix');
        this.jwtAudience = this.configService.get<string>('auth.jwt.audience');
        this.jwtIssuer = this.configService.get<string>('auth.jwt.issuer');

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
     * Uses ES512 algorithm with private key from configuration.
     * @param subject - The unique subject identifier for the token (usually user ID)
     * @param payload - The payload data to include in the token
     * @returns The signed JWT access token string
     * @throws {Error} When token signing fails
     */
    createAccessToken(
        subject: string,
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
        } as JwtSignOptions);
    }

    /**
     * Creates a JWT refresh token for the given subject and payload.
     * Uses ES512 algorithm with private key from configuration.
     * @param subject - The unique subject identifier for the token (usually user ID)
     * @param payload - The refresh token payload data to include in the token
     * @returns The signed JWT refresh token string
     * @throws {Error} When token signing fails
     */
    createRefreshToken(
        subject: string,
        payload: IAuthJwtRefreshTokenPayload
    ): string {
        return this.jwtService.sign(payload, {
            privateKey: this.jwtRefreshTokenPrivateKey,
            expiresIn: this.jwtRefreshTokenExpirationTimeInSeconds,
            audience: this.jwtAudience,
            issuer: this.jwtIssuer,
            subject,
            algorithm: this.jwtRefreshTokenAlgorithm,
            keyid: this.jwtRefreshTokenKid,
        } as JwtSignOptions);
    }

    /**
     * Validates an access token for the given subject.
     * Verifies token signature, expiration, audience, issuer and subject claims.
     * @param subject - The subject identifier to validate against
     * @param token - The JWT access token to validate
     * @returns True if the token is valid and matches the subject, false otherwise
     */
    validateAccessToken(subject: string, token: string): boolean {
        try {
            this.jwtService.verify(token, {
                publicKey: this.jwtAccessTokenPublicKey,
                algorithms: [this.jwtAccessTokenAlgorithm],
                audience: this.jwtAudience,
                issuer: this.jwtIssuer,
                subject,
            });

            return true;
        } catch {
            return false;
        }
    }

    /**
     * Validates a refresh token for the given subject.
     * Verifies token signature, expiration, audience, issuer and subject claims.
     * @param subject - The subject identifier to validate against
     * @param token - The JWT refresh token to validate
     * @returns True if the token is valid and matches the subject, false otherwise
     */
    validateRefreshToken(subject: string, token: string): boolean {
        try {
            this.jwtService.verify(token, {
                publicKey: this.jwtRefreshTokenPublicKey,
                algorithms: [this.jwtRefreshTokenAlgorithm],
                audience: this.jwtAudience,
                issuer: this.jwtIssuer,
                subject,
            });

            return true;
        } catch {
            return false;
        }
    }

    /**
     * Decodes and returns the payload from a JWT token without verification.
     * Note: This method does not validate the token signature or expiration.
     * @param token - The JWT token to decode
     * @returns The decoded payload of type T
     */
    payloadToken<T>(token: string): T {
        return this.jwtService.decode<T>(token);
    }

    /**
     * Creates the payload for an access token from user data and login information.
     * @param data - The user entity from database containing profile and role information
     * @param sessionId - The unique session identifier for this login session
     * @param loginAt - The date and time when the login occurred
     * @param loginFrom - The source/platform of the login (e.g., website, mobile)
     * @param loginWith - The authentication method used for sign-up (email, google, apple, etc.)
     * @returns The formatted access token payload containing user and session data
     */
    createPayloadAccessToken(
        data: User,
        sessionId: string,
        loginAt: Date,
        loginFrom: ENUM_USER_LOGIN_FROM,
        loginWith: ENUM_USER_SIGN_UP_WITH
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
     * Extracts only the necessary fields required for token refresh operations.
     * @param payload - The access token payload containing session and user information
     * @param payload.sessionId - The unique session identifier
     * @param payload.userId - The user's unique identifier
     * @param payload.loginFrom - The source/platform of the login
     * @param payload.loginAt - The date and time when the login occurred
     * @param payload.loginWith - The authentication method used
     * @returns The formatted refresh token payload with minimal required data
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
     * @param passwordString - The plain text password to validate
     * @param passwordHash - The bcrypt hashed password to compare against
     * @returns True if the password matches the hash, false otherwise
     */
    validatePassword(passwordString: string, passwordHash: string): boolean {
        return this.helperService.bcryptCompare(passwordString, passwordHash);
    }

    /**
     * Checks if a user has exceeded the maximum password attempt limit.
     * Returns false if password attempt checking is disabled in configuration.
     * @param user - The user entity containing password attempt information
     * @returns True if password attempts exceeded the configured limit, false otherwise
     */
    checkPasswordAttempt(user: User): boolean {
        return this.passwordAttempt
            ? user.passwordAttempt >= this.passwordMaxAttempt
            : false;
    }

    /**
     * Creates a new password hash with salt, expiration information and period expiration.
     * Generates bcrypt hash with random salt and sets expiration dates based on configuration.
     * @param password - The plain text password to hash
     * @param options - Optional settings for password creation
     * @param options.temporary - If true, uses temporary password expiration time instead of regular
     * @returns Object containing password hash, salt, creation date, expiration date, and period expiration date
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
            salt,
            passwordPeriodExpired,
        };
    }

    /**
     * Generates a random password string using the helper service.
     * @returns A randomly generated 10-character alphanumeric password string
     */
    createPasswordRandom(): string {
        return this.helperService.randomString(10);
    }

    /**
     * Checks if a password has expired based on its expiration date.
     * Compares the password expiration date with the current date.
     * @param passwordExpired - The date when the password expires
     * @returns True if the password has expired (current date > expiration date), false otherwise
     */
    checkPasswordExpired(passwordExpired: Date): boolean {
        const today: Date = this.helperService.dateCreate();
        return today > passwordExpired;
    }

    /**
     * Creates both access and refresh tokens for a user session.
     * Generates JWT tokens with current timestamp and returns complete token response.
     * @param user - The user entity containing profile and role information
     * @param sessionId - The unique session identifier for this login session
     * @param loginFrom - The source/platform of the login (website, mobile, etc.)
     * @param loginWith - The authentication method used for sign-up (email, google, apple, etc.)
     * @returns Token response object containing access token, refresh token, expiration time and metadata
     */
    createTokens(
        user: IUser,
        sessionId: string,
        loginFrom: ENUM_USER_LOGIN_FROM,
        loginWith: ENUM_USER_SIGN_UP_WITH
    ): AuthTokenResponseDto {
        const loginDate = this.helperService.dateCreate();

        const payloadAccessToken: IAuthJwtAccessTokenPayload =
            this.createPayloadAccessToken(
                user,
                sessionId,
                loginDate,
                loginFrom,
                loginWith
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
            roleType: user.role.type,
            expiresIn: this.jwtAccessTokenExpirationTimeInSeconds,
            accessToken,
            refreshToken,
        };
    }

    /**
     * Refreshes an access token using a valid refresh token.
     * Extracts session information from refresh token to generate new access token.
     * @param user - The user entity containing profile and role information
     * @param refreshTokenFromRequest - The existing refresh token to extract session data from
     * @returns Token response object containing new access token and the same refresh token
     */
    refreshToken(
        user: IUser,
        refreshTokenFromRequest: string
    ): AuthTokenResponseDto {
        const payloadRefreshToken =
            this.payloadToken<IAuthJwtRefreshTokenPayload>(
                refreshTokenFromRequest
            );

        const payloadAccessToken: IAuthJwtAccessTokenPayload =
            this.createPayloadAccessToken(
                user,
                payloadRefreshToken.sessionId,
                payloadRefreshToken.loginAt,
                payloadRefreshToken.loginFrom,
                payloadRefreshToken.loginWith
            );
        const accessToken: string = this.createAccessToken(
            user.id,
            payloadAccessToken
        );

        return {
            tokenType: this.jwtPrefix,
            roleType: user.role.type,
            expiresIn: this.jwtAccessTokenExpirationTimeInSeconds,
            accessToken,
            refreshToken: refreshTokenFromRequest,
        };
    }

    /**
     * Validates the JWT access token and ensures it contains a valid string subject (sub) claim.
     * Used by JWT guard to verify access token authenticity and extract user information.
     * @param err - Any error that occurred during JWT authentication process
     * @param user - The authenticated user payload extracted from JWT token
     * @param info - Additional information or errors from the JWT strategy
     * @returns The validated user payload if authentication succeeds
     * @throws {UnauthorizedException} When authentication fails, user data is invalid, or subject claim is missing/invalid
     */
    async validateJwtAccessGuard(
        err: Error,
        user: IAuthJwtAccessTokenPayload,
        info: Error
    ): Promise<IAuthJwtAccessTokenPayload> {
        if (err || !user) {
            throw new UnauthorizedException({
                statusCode: ENUM_AUTH_STATUS_CODE_ERROR.JWT_ACCESS_TOKEN,
                message: 'auth.error.accessTokenUnauthorized',
                _error: err ? err : info,
            });
        }

        const { sub } = user;
        if (!sub) {
            throw new UnauthorizedException({
                statusCode: ENUM_AUTH_STATUS_CODE_ERROR.JWT_ACCESS_TOKEN,
                message: 'auth.error.accessTokenUnauthorized',
            });
        } else if (typeof sub !== 'string') {
            throw new UnauthorizedException({
                statusCode: ENUM_AUTH_STATUS_CODE_ERROR.JWT_ACCESS_TOKEN,
                message: 'auth.error.accessTokenUnauthorized',
            });
        }

        return user;
    }

    /**
     * Validates the JWT refresh token and ensures it contains a valid string subject (sub) claim.
     * Used by JWT refresh guard to verify refresh token authenticity and extract user information.
     * @param err - Any error that occurred during JWT authentication process
     * @param user - The authenticated user payload extracted from JWT refresh token
     * @param info - Additional information or errors from the JWT strategy
     * @returns The validated refresh token payload if authentication succeeds
     * @throws {UnauthorizedException} When authentication fails, user data is invalid, or subject claim is missing/invalid
     */
    async validateJwtRefreshGuard(
        err: Error,
        user: IAuthJwtRefreshTokenPayload,
        info: Error
    ): Promise<IAuthJwtRefreshTokenPayload> {
        if (err || !user) {
            throw new UnauthorizedException({
                statusCode: ENUM_AUTH_STATUS_CODE_ERROR.JWT_REFRESH_TOKEN,
                message: 'auth.error.refreshTokenUnauthorized',
                _error: err ? err : info,
            });
        }

        const { sub } = user as IAuthJwtAccessTokenPayload;
        if (!sub) {
            throw new UnauthorizedException({
                statusCode: ENUM_AUTH_STATUS_CODE_ERROR.JWT_ACCESS_TOKEN,
                message: 'auth.error.accessTokenUnauthorized',
            });
        } else if (typeof sub !== 'string') {
            throw new UnauthorizedException({
                statusCode: ENUM_AUTH_STATUS_CODE_ERROR.JWT_ACCESS_TOKEN,
                message: 'auth.error.accessTokenUnauthorized',
            });
        }

        return user;
    }

    /**
     * Validates the Apple social authentication token from the request headers.
     * Extracts the Apple ID token, verifies it with Apple's servers, and attaches user data to the request.
     * @param request - The HTTP request object containing Authorization header with Apple ID token
     * @returns Promise<boolean> - Resolves to true if authentication is successful
     * @throws {UnauthorizedException} When token is missing, malformed, or verification with Apple fails
     */
    async validateOAuthAppleGuard(
        request: IRequestApp<IAuthSocialPayload>
    ): Promise<boolean> {
        const requestHeader =
            (
                request.headers[`${this.appleHeader?.toLowerCase()}`] as string
            )?.split(`${this.applePrefix} `) ?? [];

        if (!requestHeader || requestHeader.length !== 2) {
            throw new UnauthorizedException({
                statusCode: ENUM_AUTH_STATUS_CODE_ERROR.SOCIAL_GOOGLE_REQUIRED,
                message: 'auth.error.socialAppleRequired',
            });
        }

        try {
            const idToken: string = requestHeader[1];

            const payload = await verifyAppleToken({
                idToken,
                clientId: [this.appleClientId, this.appleSignInClientId],
            });

            request.user = {
                email: payload.email,
                emailVerified: payload.email_verified,
            };

            return true;
        } catch (err: unknown) {
            throw new UnauthorizedException({
                statusCode: ENUM_AUTH_STATUS_CODE_ERROR.SOCIAL_GOOGLE_INVALID,
                message: 'auth.error.socialAppleInvalid',
                _error: err,
            });
        }
    }

    /**
     * Validates the Google social authentication token from the request headers.
     * Extracts the Google ID token, verifies it using Google's OAuth2 client, and attaches user data to the request.
     * @param request - The HTTP request object containing Authorization header with Google ID token
     * @returns Promise<boolean> - Resolves to true if authentication is successful
     * @throws {UnauthorizedException} When token is missing, malformed, or verification with Google fails
     */
    async validateOAuthGoogleGuard(
        request: IRequestApp<IAuthSocialPayload>
    ): Promise<boolean> {
        const requestHeader =
            (
                request.headers[`${this.googleHeader?.toLowerCase()}`] as string
            )?.split(`${this.googlePrefix} `) ?? [];

        if (!requestHeader || requestHeader.length !== 2) {
            throw new UnauthorizedException({
                statusCode: ENUM_AUTH_STATUS_CODE_ERROR.SOCIAL_GOOGLE_REQUIRED,
                message: 'auth.error.socialGoogleRequired',
            });
        }

        try {
            const idToken: string = requestHeader[1];

            const login: LoginTicket = await this.googleClient.verifyIdToken({
                idToken,
            });
            const payload: TokenPayload = login.getPayload();

            request.user = {
                email: payload.email,
                emailVerified: payload.email_verified,
            };

            return true;
        } catch (err: unknown) {
            throw new UnauthorizedException({
                statusCode: ENUM_AUTH_STATUS_CODE_ERROR.SOCIAL_GOOGLE_INVALID,
                message: 'auth.error.socialGoogleInvalid',
                _error: err,
            });
        }
    }
}
