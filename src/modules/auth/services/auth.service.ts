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
import { readFileSync } from 'fs';
import { JwtService, JwtSignOptions } from '@nestjs/jwt';
import { join } from 'path';
import { IAuthService } from '@modules/auth/interfaces/auth.service.interface';
import { HelperService } from '@common/helper/services/helper.service';
import { AuthTokenResponseDto } from '@modules/auth/dtos/response/auth.token.response.dto';
import { IUser } from '@modules/user/interfaces/user.interface';
import {
    ENUM_USER_LOGIN_FROM,
    ENUM_USER_SIGN_UP_WITH,
    User,
} from '@prisma/client';

/**
 * Authentication service providing JWT token management, password operations,
 * and social authentication integration. Handles access and refresh token
 * generation, validation, and payload management for user authentication
 * across the application.
 */
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

    /**
     * Creates a JWT access token for the given subject and payload.
     * @param subject The subject identifier for the token
     * @param payload The payload data to include in the token
     * @returns The signed JWT access token string
     */
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

    /**
     * Creates a JWT refresh token for the given subject and payload.
     * @param subject The subject identifier for the token
     * @param payload The payload data to include in the token
     * @returns The signed JWT refresh token string
     */
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

    /**
     * Validates an access token for the given subject.
     * @param subject The subject identifier to validate against
     * @param token The access token to validate
     * @returns True if the token is valid, false otherwise
     */
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

    /**
     * Validates a refresh token for the given subject.
     * @param subject The subject identifier to validate against
     * @param token The refresh token to validate
     * @returns True if the token is valid, false otherwise
     */
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

    /**
     * Decodes and returns the payload from a JWT token.
     * @param token The JWT token to decode
     * @returns The decoded payload of type T
     */
    payloadToken<T>(token: string): T {
        return this.jwtService.decode<T>(token);
    }

    /**
     * Creates the payload for an access token from user data and login information.
     * @param data The user data containing profile and role information
     * @param sessionId The unique session identifier
     * @param loginAt The date and time of login
     * @param loginFrom The source of the login (credential, social, etc.)
     * @returns The formatted access token payload
     */
    createPayloadAccessToken(
        data: IUser,
        sessionId: string,
        loginAt: Date,
        loginFrom: ENUM_USER_LOGIN_FROM,
        loginWith: ENUM_USER_SIGN_UP_WITH
    ): IAuthJwtAccessTokenPayload {
        return {
            userId: data.id,
            type: data.role.type,
            roleId: data.role.id,
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
     * @param payload The access token payload containing session and user information
     * @returns The formatted refresh token payload
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
     * Validates a password by comparing it with the stored hash.
     * @param passwordString The plain text password to validate
     * @param passwordHash The hashed password to compare against
     * @returns True if the password matches, false otherwise
     */
    validatePassword(passwordString: string, passwordHash: string): boolean {
        return this.helperService.bcryptCompare(passwordString, passwordHash);
    }

    /**
     * Checks if a user has exceeded the maximum password attempt limit.
     * @param user The user object containing password attempt information
     * @returns True if password attempts exceeded limit, false otherwise
     */
    checkPasswordAttempt(user: User): boolean {
        return this.passwordAttempt
            ? user.passwordAttempt > this.passwordMaxAttempt
            : false;
    }

    /**
     * Creates a new password hash with salt and expiration information.
     * @param password The plain text password to hash
     * @param options Optional settings for password creation (e.g., temporary password)
     * @returns Object containing password hash, salt, creation date, and expiration date
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

    /**
     * Generates a random password string.
     * @returns A randomly generated 10-character password
     */
    createPasswordRandom(): string {
        return this.helperService.randomString(10);
    }

    /**
     * Checks if a password has expired based on its expiration date.
     * @param passwordExpired The date when the password expires
     * @returns True if the password has expired, false otherwise
     */
    checkPasswordExpired(passwordExpired: Date): boolean {
        const today: Date = this.helperService.dateCreate();
        return today > passwordExpired;
    }

    /**
     * Creates both access and refresh tokens for a user session.
     * @param user The user object containing profile and role information
     * @param sessionId The unique session identifier
     * @param loginFrom The source of the login (credential, social, etc.)
     * @param loginWith The method used for sign-up (email, google, apple, etc.)
     * @returns Token response object containing access token, refresh token, and metadata
     */
    createTokens(
        user: IUser,
        sessionId: string,
        loginFrom: ENUM_USER_LOGIN_FROM,
        loginWith: ENUM_USER_SIGN_UP_WITH
    ): AuthTokenResponseDto {
        const loginDate = this.helperService.dateCreate();
        const roleType = user.role.type;

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
            roleType,
            expiresIn: this.jwtAccessTokenExpirationTime,
            accessToken,
            refreshToken,
        };
    }

    /**
     * Refreshes an access token using a valid refresh token.
     * @param user The user object containing profile and role information
     * @param refreshTokenFromRequest The refresh token to validate and use for refresh
     * @returns Token response object containing new access token and existing refresh token
     */
    refreshToken(
        user: IUser,
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
            roleType,
            expiresIn: this.jwtAccessTokenExpirationTime,
            accessToken,
            refreshToken: refreshTokenFromRequest,
        };
    }

    /**
     * Verifies and extracts information from an Apple ID token.
     * @param token The Apple ID token to verify
     * @returns Promise containing the verified token payload with email and verification status
     */
    async appleGetTokenInfo(token: string): Promise<IAuthSocialPayload> {
        const payload = await verifyAppleToken({
            idToken: token,
            clientId: [this.appleClientId, this.appleSignInClientId],
        });

        return { email: payload.email, emailVerified: payload.email_verified };
    }

    /**
     * Verifies and extracts information from a Google ID token.
     * @param idToken The Google ID token to verify
     * @returns Promise containing the verified token payload with email and verification status
     */
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
