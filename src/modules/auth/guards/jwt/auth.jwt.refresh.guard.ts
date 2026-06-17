import { AuthGuard } from '@nestjs/passport';
import { Injectable } from '@nestjs/common';
import {
    IAuthJwtAccessTokenPayload,
    IAuthJwtRefreshTokenPayload,
} from '@modules/auth/interfaces/auth.interface';
import { AuthJwtRefreshGuardKey, AuthPayloadStoreKey } from '@modules/auth/constants/auth.constant';
import { AuthService } from '@modules/auth/services/auth.service';
import { RequestStoreService } from '@common/request/services/request.store.service';

/**
 * JWT Refresh Token Guard for protecting routes that require refresh token authentication.
 * Extends NestJS AuthGuard and validates JWT refresh tokens.
 * Used specifically for token refresh endpoints in the authentication flow.
 */
@Injectable()
export class AuthJwtRefreshGuard extends AuthGuard(AuthJwtRefreshGuardKey) {
    constructor(
        private readonly authService: AuthService,
        private readonly requestStoreService: RequestStoreService
    ) {
        super();
    }

    /**
     * Handles the request validation after JWT refresh token strategy processing.
     * Validates that the user exists, has a valid subject (sub) claim,
     * and that the subject is a string format for refresh token operations.
     *
     * @param {Error} err - Any error that occurred during authentication
     * @param {IAuthJwtRefreshTokenPayload} user - The authenticated user payload from JWT refresh token
     * @param {Error} info - Additional information about the authentication process
     * @returns {T} The validated user payload
     * @throws {UnauthorizedException} When authentication fails or user data is invalid
     */
    handleRequest<T = IAuthJwtRefreshTokenPayload>(
        err: Error,
        user: IAuthJwtRefreshTokenPayload,
        info: Error
    ): T {
        const payload = this.authService.validateJwtRefreshGuard(
            err,
            user,
            info
        );

        this.requestStoreService.set(
            AuthPayloadStoreKey,
            payload as IAuthJwtAccessTokenPayload
        );

        return payload as T;
    }
}
