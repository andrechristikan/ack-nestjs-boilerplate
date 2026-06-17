import { AuthGuard } from '@nestjs/passport';
import { Injectable } from '@nestjs/common';
import { IAuthJwtAccessTokenPayload } from '@modules/auth/interfaces/auth.interface';
import {
    AuthJwtAccessGuardKey,
    AuthPayloadStoreKey,
} from '@modules/auth/constants/auth.constant';
import { AuthService } from '@modules/auth/services/auth.service';
import { RequestStoreService } from '@common/request/services/request.store.service';

/**
 * JWT Access Token Guard for protecting routes with access token authentication.
 * Extends NestJS AuthGuard and validates JWT access tokens.
 */
@Injectable()
export class AuthJwtAccessGuard extends AuthGuard(AuthJwtAccessGuardKey) {
    constructor(
        private readonly authService: AuthService,
        private readonly requestStoreService: RequestStoreService
    ) {
        super();
    }

    /**
     * Handles the request validation after JWT strategy processing.
     * Validates that the user exists, has a valid subject (sub) claim,
     * and that the subject is a string format.
     *
     * @param {Error} err - Any error that occurred during authentication
     * @param {IAuthJwtAccessTokenPayload} user - The authenticated user payload from JWT token
     * @param {Error} info - Additional information about the authentication process
     * @returns {T} The validated user payload
     * @throws {UnauthorizedException} When authentication fails or user data is invalid
     */
    handleRequest<T = IAuthJwtAccessTokenPayload>(
        err: Error,
        user: IAuthJwtAccessTokenPayload,
        info: Error
    ): T {
        const payload = this.authService.validateJwtAccessGuard(
            err,
            user,
            info
        );

        this.requestStoreService.set(AuthPayloadStoreKey, payload);

        return payload as T;
    }
}
