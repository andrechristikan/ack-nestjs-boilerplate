import { AuthGuard } from '@nestjs/passport';
import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ENUM_AUTH_STATUS_CODE_ERROR } from '@modules/auth/enums/auth.status-code.enum';
import { isUUID } from 'class-validator';
import { IAuthJwtAccessTokenPayload } from '@modules/auth/interfaces/auth.interface';
import { AuthJwtAccessGuardKey } from '@modules/auth/constants/auth.constant';

/**
 * JWT Access Token Guard for protecting routes with access token authentication
 * This guard extends the NestJS AuthGuard and validates JWT access tokens,
 * ensuring that the token contains a valid UUID subject (sub) claim.
 */
@Injectable()
export class AuthJwtAccessGuard extends AuthGuard(AuthJwtAccessGuardKey) {
    /**
     * Handles the request validation after JWT strategy processing
     * Validates that the user exists, has a valid subject (sub) claim,
     * and that the subject is a valid UUID format.
     *
     * @param err - Any error that occurred during authentication
     * @param user - The authenticated user payload from JWT token
     * @param info - Additional information about the authentication process
     * @returns The validated user payload
     * @throws UnauthorizedException when authentication fails or user data is invalid
     */
    handleRequest<T = IAuthJwtAccessTokenPayload>(
        err: Error,
        user: T,
        info: Error
    ): T {
        if (err || !user) {
            throw new UnauthorizedException({
                statusCode: ENUM_AUTH_STATUS_CODE_ERROR.JWT_ACCESS_TOKEN,
                message: 'auth.error.accessTokenUnauthorized',
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
