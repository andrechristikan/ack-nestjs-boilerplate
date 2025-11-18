import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common';
import { IRequestApp } from '@common/request/interfaces/request.interface';
import { IAuthSocialPayload } from '@modules/auth/interfaces/auth.interface';
import { AuthService } from '@modules/auth/services/auth.service';

/**
 * Guard for validating Google social authentication tokens.
 * Implements CanActivate interface to protect routes that require Google authentication.
 */
@Injectable()
export class AuthSocialGoogleGuard implements CanActivate {
    constructor(private readonly authService: AuthService) {}

    /**
     * Validates Google authentication token and attaches user payload to request.
     * @param context - The execution context containing the HTTP request
     * @returns Promise<boolean> - True if authentication is successful
     * @throws UnauthorizedException - When token is missing, malformed, or invalid
     */
    async canActivate(context: ExecutionContext): Promise<boolean> {
        const request = context
            .switchToHttp()
            .getRequest<IRequestApp<IAuthSocialPayload>>();

        return this.authService.validateOAuthGoogleGuard(request);
    }
}
