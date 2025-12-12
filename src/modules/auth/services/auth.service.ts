import { DatabaseUtil } from '@common/database/utils/database.util';
import { HelperService } from '@common/helper/services/helper.service';
import { IRequestApp } from '@common/request/interfaces/request.interface';
import { AuthTokenResponseDto } from '@modules/auth/dtos/response/auth.token.response.dto';
import { EnumAuthStatusCodeError } from '@modules/auth/enums/auth.status-code.enum';
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
import { EnumUserLoginFrom, EnumUserSignUpWith } from '@prisma/client';
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
     *
     * Generates JWT tokens with current timestamp, unique session ID, and unique token identifier (jti)
     * for session tracking and security validation.
     *
     * @param user - The user entity containing profile and role information
     * @param loginFrom - The source/platform of the login (website, mobile, etc.)
     * @param loginWith - The authentication method used for sign-up (email, google, apple, etc.)
     * @returns Token response object containing access token, refresh token, expiration time, jti, and sessionId
     */
    createTokens(
        user: IUser,
        loginFrom: EnumUserLoginFrom,
        loginWith: EnumUserSignUpWith
    ): IAuthTokenGenerate {
        const loginDate = this.helperService.dateCreate();

        const sessionId = this.databaseUtil.createId();
        const jti = this.authUtil.generateJti();
        const payloadAccessToken: IAuthJwtAccessTokenPayload =
            this.authUtil.createPayloadAccessToken(
                user,
                sessionId,
                loginDate,
                loginFrom,
                loginWith
            );
        const accessToken: string = this.authUtil.createAccessToken(
            user.id,
            jti,
            payloadAccessToken
        );

        const payloadRefreshToken: IAuthJwtRefreshTokenPayload =
            this.authUtil.createPayloadRefreshToken(payloadAccessToken);
        const refreshToken: string = this.authUtil.createRefreshToken(
            user.id,
            jti,
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
            jti,
            sessionId,
        };
    }

    /**
     * Refreshes an access token using a valid refresh token.
     *
     * Extracts session information from refresh token to generate new access token with a newly generated
     * token identifier (jti). Also generates a new refresh token with adjusted expiration time based on remaining validity.
     *
     * @param user - The user entity containing profile and role information
     * @param refreshTokenFromRequest - The existing refresh token to extract session data from
     * @returns Token response object containing new access token, new refresh token with adjusted expiry, new jti, and sessionId
     */
    refreshToken(
        user: IUser,
        refreshTokenFromRequest: string
    ): IAuthTokenGenerate {
        const { sessionId, loginAt, loginFrom, loginWith } =
            this.authUtil.payloadToken<IAuthJwtRefreshTokenPayload>(
                refreshTokenFromRequest
            );

        const jti = this.authUtil.generateJti();
        const payloadAccessToken: IAuthJwtAccessTokenPayload =
            this.authUtil.createPayloadAccessToken(
                user,
                sessionId,
                loginAt,
                loginFrom,
                loginWith
            );
        const accessToken: string = this.authUtil.createAccessToken(
            user.id,
            jti,
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
            jti,
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
            jti,
            sessionId,
        };
    }

    /**
     * Validates the JWT access token strategy for Passport.
     *
     * Verifies that the access token payload contains required fields (sub, sessionId, jti)
     * and validates the session exists with matching token identifier to prevent session hijacking.
     *
     * @param payload - The decoded JWT access token payload
     * @returns Promise resolving to the validated payload if all checks pass
     * @throws {UnauthorizedException} When required fields are missing, invalid type, or session validation fails
     *
     * @see {@link AuthJwtAccessStrategy} for the Passport strategy that calls this method
     */
    async validateJwtAccessStrategy(
        payload: IAuthJwtAccessTokenPayload
    ): Promise<IAuthJwtAccessTokenPayload> {
        const { sub, sessionId, jti } = payload;

        if (
            !sub ||
            !sessionId ||
            typeof sub !== 'string' ||
            !jti ||
            typeof jti !== 'string'
        ) {
            throw new UnauthorizedException({
                statusCode: EnumAuthStatusCodeError.jwtAccessTokenInvalid,
                message: 'auth.error.accessTokenUnauthorized',
            });
        }

        const isValidSession = await this.sessionUtil.getLogin(sub, sessionId);
        if (!isValidSession || jti !== isValidSession.jti) {
            throw new UnauthorizedException({
                statusCode: ENUM_SESSION_STATUS_CODE_ERROR.forbidden,
                message: 'session.error.forbidden',
            });
        }

        return payload;
    }

    /**
     * Validates the access token guard callback from Passport.
     *
     * Handles error cases that may occur during token verification and returns the authenticated user.
     * Throws an exception if authentication fails or user is not present.
     *
     * @param err - Any error that occurred during token verification
     * @param user - The authenticated user object from the decoded token
     * @param info - Additional information from the verification process
     * @returns Promise resolving to the authenticated user if validation succeeds
     * @throws {UnauthorizedException} When error exists, user is not present, or verification fails
     *
     * @see {@link AuthJwtAccessStrategy} for the Passport strategy that calls this guard
     */
    async validateJwtAccessGuard(
        err: Error,
        user: IAuthJwtAccessTokenPayload,
        info: Error
    ): Promise<IAuthJwtAccessTokenPayload> {
        if (err || !user) {
            throw new UnauthorizedException({
                statusCode: EnumAuthStatusCodeError.jwtAccessTokenInvalid,
                message: 'auth.error.accessTokenUnauthorized',
                _error: err ? err : info,
            });
        }

        return user;
    }

    /**
     * Validates the JWT refresh token strategy for Passport.
     *
     * Verifies that the refresh token payload contains required fields (sub, sessionId, jti)
     * and validates the session exists with matching token identifier to prevent session hijacking.
     *
     * @param payload - The decoded JWT refresh token payload
     * @returns Promise resolving to the validated payload if all checks pass
     * @throws {UnauthorizedException} When required fields are missing, invalid type, or session validation fails
     *
     * @see {@link AuthJwtRefreshStrategy} for the Passport strategy that calls this method
     */
    async validateJwtRefreshStrategy(
        payload: IAuthJwtRefreshTokenPayload
    ): Promise<IAuthJwtRefreshTokenPayload> {
        const { sub, sessionId, jti } = payload;
        if (
            !sub ||
            !sessionId ||
            typeof sub !== 'string' ||
            !jti ||
            typeof jti !== 'string'
        ) {
            throw new UnauthorizedException({
                statusCode: EnumAuthStatusCodeError.jwtRefreshTokenInvalid,
                message: 'auth.error.refreshTokenUnauthorized',
            });
        }

        const isValidSession = await this.sessionUtil.getLogin(sub, sessionId);
        if (!isValidSession || jti !== isValidSession.jti) {
            throw new UnauthorizedException({
                statusCode: ENUM_SESSION_STATUS_CODE_ERROR.forbidden,
                message: 'session.error.forbidden',
            });
        }

        return payload;
    }

    /**
     * Validates the refresh token guard callback from Passport.
     *
     * Handles error cases that may occur during token verification and returns the authenticated user.
     * Throws an exception if authentication fails or user is not present.
     *
     * @param err - Any error that occurred during token verification
     * @param user - The authenticated user object from the decoded token
     * @param info - Additional information from the verification process
     * @returns Promise resolving to the authenticated user if validation succeeds
     * @throws {UnauthorizedException} When error exists, user is not present, or verification fails
     *
     */
    async validateJwtRefreshGuard(
        err: Error,
        user: IAuthJwtRefreshTokenPayload,
        info: Error
    ): Promise<IAuthJwtRefreshTokenPayload> {
        if (err || !user) {
            throw new UnauthorizedException({
                statusCode: EnumAuthStatusCodeError.jwtRefreshTokenInvalid,
                message: 'auth.error.refreshTokenUnauthorized',
                _error: err ? err : info,
            });
        }

        return user;
    }

    /**
     * Validates the Apple social authentication token from the request headers.
     *
     * Extracts the Apple ID token from Authorization header, verifies it with Apple's servers,
     * and attaches user data to the request. Sets verified email and email verification status
     * in the request user object.
     *
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
                statusCode: EnumAuthStatusCodeError.socialGoogleRequired,
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
                statusCode: EnumAuthStatusCodeError.socialGoogleInvalid,
                message: 'auth.error.socialAppleInvalid',
                _error: err,
            });
        }
    }

    /**
     * Validates the Google social authentication token from the request headers.
     *
     * Extracts the Google ID token from Authorization header, verifies it using Google's OAuth2 client,
     * and attaches user data to the request. Sets verified email and email verification status
     * in the request user object.
     *
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
                statusCode: EnumAuthStatusCodeError.socialGoogleRequired,
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
                statusCode: EnumAuthStatusCodeError.socialGoogleInvalid,
                message: 'auth.error.socialGoogleInvalid',
                _error: err,
            });
        }
    }
}
