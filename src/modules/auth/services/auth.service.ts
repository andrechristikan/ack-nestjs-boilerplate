import { DatabaseUtil } from '@common/database/utils/database.util';
import { HelperService } from '@common/helper/services/helper.service';
import { IRequestApp } from '@common/request/interfaces/request.interface';
import { AuthTokenResponseDto } from '@modules/auth/dtos/response/auth.token.response.dto';
import { ENUM_AUTH_STATUS_CODE_ERROR } from '@modules/auth/enums/auth.status-code.enum';
import {
    IAuthJwtAccessTokenPayload,
    IAuthJwtRefreshTokenPayload,
    IAuthSocialPayload,
    IAuthTokenGenerate,
} from '@modules/auth/interfaces/auth.interface';
import { IAuthService } from '@modules/auth/interfaces/auth.service.interface';
import { AuthUtil } from '@modules/auth/utils/auth.util';
import { ENUM_SESSION_STATUS_CODE_ERROR } from '@modules/session/enums/session.status-code.enum';
import { SessionUtil } from '@modules/session/utils/session.util';
import { IUser } from '@modules/user/interfaces/user.interface';
import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ENUM_USER_LOGIN_FROM, ENUM_USER_SIGN_UP_WITH } from '@prisma/client';
import { TokenPayload } from 'google-auth-library';

/**
 * Authentication service handling JWT token operations, session validation,
 * and social authentication (Google, Apple). Manages token creation, refresh,
 * and authentication guard validations for secure user access.
 */
@Injectable()
export class AuthService implements IAuthService {
    constructor(
        private readonly helperService: HelperService,
        private readonly authUtil: AuthUtil,
        private readonly sessionUtil: SessionUtil,
        private readonly databaseUtil: DatabaseUtil
    ) {}

    /**
     * Creates both access and refresh tokens for a user session.
     * Generates JWT tokens with current timestamp, unique session ID, and unique fingerprint for device tracking.
     * @param user - The user entity containing profile and role information
     * @param loginFrom - The source/platform of the login (website, mobile, etc.)
     * @param loginWith - The authentication method used for sign-up (email, google, apple, etc.)
     * @returns Token response object containing access token, refresh token, expiration time, metadata, fingerprint and generated sessionId
     */
    createTokens(
        user: IUser,
        loginFrom: ENUM_USER_LOGIN_FROM,
        loginWith: ENUM_USER_SIGN_UP_WITH
    ): IAuthTokenGenerate {
        const loginDate = this.helperService.dateCreate();

        const sessionId = this.databaseUtil.createId();
        const fingerprint = this.authUtil.generateFingerprint();
        const payloadAccessToken: IAuthJwtAccessTokenPayload =
            this.authUtil.createPayloadAccessToken(
                user,
                fingerprint,
                sessionId,
                loginDate,
                loginFrom,
                loginWith
            );
        const accessToken: string = this.authUtil.createAccessToken(
            user.id,
            payloadAccessToken
        );

        const payloadRefreshToken: IAuthJwtRefreshTokenPayload =
            this.authUtil.createPayloadRefreshToken(payloadAccessToken);
        const refreshToken: string = this.authUtil.createRefreshToken(
            user.id,
            payloadRefreshToken
        );

        const tokens: AuthTokenResponseDto = {
            tokenType: this.authUtil.jwtPrefix,
            roleType: user.role.type,
            expiresIn: this.authUtil.jwtAccessTokenExpirationTimeInSeconds,
            accessToken,
            refreshToken,
        };

        return {
            tokens,
            fingerprint,
            sessionId,
        };
    }

    /**
     * Refreshes an access token using a valid refresh token.
     * Extracts session information from refresh token to generate new access token with a newly generated fingerprint.
     * Also generates a new refresh token with adjusted expiration time based on remaining validity.
     * @param user - The user entity containing profile and role information
     * @param refreshTokenFromRequest - The existing refresh token to extract session data from
     * @returns Token response object containing new access token, new refresh token with adjusted expiry, new fingerprint, and sessionId
     */
    refreshToken(
        user: IUser,
        refreshTokenFromRequest: string
    ): IAuthTokenGenerate {
        const { sessionId, loginAt, loginFrom, loginWith } =
            this.authUtil.payloadToken<IAuthJwtRefreshTokenPayload>(
                refreshTokenFromRequest
            );

        const fingerprint = this.authUtil.generateFingerprint();
        const payloadAccessToken: IAuthJwtAccessTokenPayload =
            this.authUtil.createPayloadAccessToken(
                user,
                fingerprint,
                sessionId,
                loginAt,
                loginFrom,
                loginWith
            );
        const accessToken: string = this.authUtil.createAccessToken(
            user.id,
            payloadAccessToken
        );

        const newPayloadRefreshToken: IAuthJwtRefreshTokenPayload =
            this.authUtil.createPayloadRefreshToken(payloadAccessToken);

        const today = this.helperService.dateCreate();
        const expiredAt = this.helperService.dateCreateFromTimestamp(
            newPayloadRefreshToken.exp * 1000
        );
        const newRefreshTokenExpireInSeconds = this.helperService.dateDiff(
            today,
            expiredAt
        );
        const newRefreshToken: string = this.authUtil.createRefreshToken(
            user.id,
            newPayloadRefreshToken,
            newRefreshTokenExpireInSeconds.seconds
        );

        const tokens: AuthTokenResponseDto = {
            tokenType: this.authUtil.jwtPrefix,
            roleType: user.role.type,
            expiresIn: this.authUtil.jwtAccessTokenExpirationTimeInSeconds,
            accessToken,
            refreshToken: newRefreshToken,
        };

        return {
            tokens,
            fingerprint,
            sessionId,
        };
    }

    /**
     * Validates the JWT access token and ensures it contains a valid string subject (sub) claim.
     * Used by JWT guard to verify access token authenticity, extract user information, and validate active session.
     * @param err - Any error that occurred during JWT authentication process
     * @param user - The authenticated user payload extracted from JWT token
     * @param info - Additional information or errors from the JWT strategy
     * @returns The validated user payload if authentication succeeds
     * @throws {UnauthorizedException} When authentication fails, user data is invalid, subject claim is missing/invalid, or session is inactive
     */
    async validateJwtAccessGuard(
        err: Error,
        user: IAuthJwtAccessTokenPayload,
        info: Error
    ): Promise<IAuthJwtAccessTokenPayload> {
        if (err || !user) {
            throw new UnauthorizedException({
                statusCode:
                    ENUM_AUTH_STATUS_CODE_ERROR.JWT_ACCESS_TOKEN_INVALID,
                message: 'auth.error.accessTokenUnauthorized',
                _error: err ? err : info,
            });
        }

        const { sub, sessionId, fingerprint } = user;
        if (
            !sub ||
            !sessionId ||
            typeof sub !== 'string' ||
            !fingerprint ||
            typeof fingerprint !== 'string'
        ) {
            throw new UnauthorizedException({
                statusCode:
                    ENUM_AUTH_STATUS_CODE_ERROR.JWT_ACCESS_TOKEN_INVALID,
                message: 'auth.error.accessTokenUnauthorized',
            });
        }

        const isValidSession = await this.sessionUtil.getLogin(sub, sessionId);
        if (!isValidSession || fingerprint !== isValidSession.fingerprint) {
            throw new UnauthorizedException({
                statusCode: ENUM_SESSION_STATUS_CODE_ERROR.FORBIDDEN,
                message: 'session.error.forbidden',
            });
        }

        return user;
    }

    /**
     * Validates the JWT refresh token and ensures it contains a valid string subject (sub) claim.
     * Used by JWT refresh guard to verify refresh token authenticity, extract user information, and validate active session.
     * @param err - Any error that occurred during JWT authentication process
     * @param user - The authenticated user payload extracted from JWT refresh token
     * @param info - Additional information or errors from the JWT strategy
     * @returns The validated refresh token payload if authentication succeeds
     * @throws {UnauthorizedException} When authentication fails, user data is invalid, subject claim is missing/invalid, or session is inactive
     */
    async validateJwtRefreshGuard(
        err: Error,
        user: IAuthJwtRefreshTokenPayload,
        info: Error
    ): Promise<IAuthJwtRefreshTokenPayload> {
        if (err || !user) {
            throw new UnauthorizedException({
                statusCode:
                    ENUM_AUTH_STATUS_CODE_ERROR.JWT_REFRESH_TOKEN_INVALID,
                message: 'auth.error.refreshTokenUnauthorized',
                _error: err ? err : info,
            });
        }

        const { sub, sessionId, fingerprint } =
            user as IAuthJwtAccessTokenPayload;
        if (
            !sub ||
            !sessionId ||
            typeof sub !== 'string' ||
            !fingerprint ||
            typeof fingerprint !== 'string'
        ) {
            throw new UnauthorizedException({
                statusCode:
                    ENUM_AUTH_STATUS_CODE_ERROR.JWT_REFRESH_TOKEN_INVALID,
                message: 'auth.error.refreshTokenUnauthorized',
            });
        }

        const isValidSession = await this.sessionUtil.getLogin(sub, sessionId);
        if (!isValidSession || fingerprint !== isValidSession.fingerprint) {
            throw new UnauthorizedException({
                statusCode: ENUM_SESSION_STATUS_CODE_ERROR.FORBIDDEN,
                message: 'session.error.forbidden',
            });
        }

        return user;
    }

    /**
     * Validates the Apple social authentication token from the request headers.
     * Extracts the Apple ID token from Authorization header, verifies it with Apple's servers, and attaches user data to the request.
     * Sets verified email and email verification status in the request user object.
     * @param request - The HTTP request object containing Authorization header with Apple ID token in format "Bearer {token}"
     * @returns Promise resolving to true if authentication is successful
     * @throws {UnauthorizedException} When token is missing, malformed, header format is incorrect, or verification with Apple fails
     */
    async validateOAuthAppleGuard(
        request: IRequestApp<IAuthSocialPayload>
    ): Promise<boolean> {
        const requestHeaders = this.authUtil.extractHeaderApple(request);
        if (requestHeaders.length !== 2) {
            throw new UnauthorizedException({
                statusCode: ENUM_AUTH_STATUS_CODE_ERROR.SOCIAL_GOOGLE_REQUIRED,
                message: 'auth.error.socialAppleRequired',
            });
        }

        try {
            const payload = await this.authUtil.verifyApple(requestHeaders[1]);

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
     * Extracts the Google ID token from Authorization header, verifies it using Google's OAuth2 client, and attaches user data to the request.
     * Sets verified email and email verification status in the request user object.
     * @param request - The HTTP request object containing Authorization header with Google ID token in format "Bearer {token}"
     * @returns Promise resolving to true if authentication is successful
     * @throws {UnauthorizedException} When token is missing, malformed, header format is incorrect, or verification with Google fails
     */
    async validateOAuthGoogleGuard(
        request: IRequestApp<IAuthSocialPayload>
    ): Promise<boolean> {
        const requestHeaders = this.authUtil.extractHeaderGoogle(request);

        if (requestHeaders.length !== 2) {
            throw new UnauthorizedException({
                statusCode: ENUM_AUTH_STATUS_CODE_ERROR.SOCIAL_GOOGLE_REQUIRED,
                message: 'auth.error.socialGoogleRequired',
            });
        }

        try {
            const payload: TokenPayload = await this.authUtil.verifyGoogle(
                requestHeaders[1]
            );

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
