import { AuthGuard } from '@nestjs/passport';
import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ENUM_AUTH_STATUS_CODE_ERROR } from '@modules/auth/enums/auth.status-code.enum';
import { isUUID } from 'class-validator';
import {
    IAuthJwtAccessTokenPayload,
    IAuthJwtRefreshTokenPayload,
} from '@modules/auth/interfaces/auth.interface';
import { AuthJwtRefreshGuardKey } from '@modules/auth/constants/auth.constant';

/**
 * JWT Refresh Token Guard for protecting routes that require refresh token authentication
 * This guard extends the NestJS AuthGuard and validates JWT refresh tokens,
 * ensuring that the token contains a valid UUID subject (sub) claim.
 * Used specifically for token refresh endpoints in the authentication flow.
 */
@Injectable()
export class AuthJwtRefreshGuard extends AuthGuard(AuthJwtRefreshGuardKey) {
    /**
     * Handles the request validation after JWT refresh token strategy processing
     * Validates that the user exists, has a valid subject (sub) claim,
     * and that the subject is a valid UUID format for refresh token operations.
     *
     * @param err - Any error that occurred during authentication
     * @param user - The authenticated user payload from JWT refresh token
     * @param info - Additional information about the authentication process
     * @returns The validated user payload
     * @throws UnauthorizedException when authentication fails or user data is invalid
     */
    handleRequest<T = IAuthJwtRefreshTokenPayload>(
        err: Error,
        user: T,
        info: Error
    ): T {
        // TODO: MOVE LOGIC TO SERVICE
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
        } else if (!isUUID(sub)) {
            throw new UnauthorizedException({
                statusCode: ENUM_AUTH_STATUS_CODE_ERROR.JWT_ACCESS_TOKEN,
                message: 'auth.error.accessTokenUnauthorized',
            });
        }

        return user;
    }
}
