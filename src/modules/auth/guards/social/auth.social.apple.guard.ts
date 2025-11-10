import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common';
import { IRequestApp } from '@common/request/interfaces/request.interface';
import { IAuthSocialPayload } from '@modules/auth/interfaces/auth.interface';
import { AuthUtil } from '@modules/auth/utils/auth.util';

/**
 * Guard for validating Apple social authentication tokens.
 * Implements CanActivate interface to protect routes that require Apple authentication.
 */
@Injectable()
export class AuthSocialAppleGuard implements CanActivate {
    constructor(private readonly authUtil: AuthUtil) {}

    /**
     * Validates Apple authentication token and attaches user payload to request.
     *
     * @param {ExecutionContext} context - The execution context containing the HTTP request
     * @returns {Promise<boolean>} True if authentication is successful
     * @throws {UnauthorizedException} When token is missing, malformed, or invalid
     */
    async canActivate(context: ExecutionContext): Promise<boolean> {
        const request = context
            .switchToHttp()
            .getRequest<IRequestApp<IAuthSocialPayload>>();
        return this.authUtil.validateOAuthAppleGuard(request);
    }
}
