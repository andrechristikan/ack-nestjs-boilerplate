import { ExecutionContext, UseGuards, applyDecorators } from '@nestjs/common';
import { createParamDecorator } from '@nestjs/common';
import { IRequestApp } from '@common/request/interfaces/request.interface';
import { AuthJwtAccessGuard } from '@modules/auth/guards/jwt/auth.jwt.access.guard';
import { AuthJwtRefreshGuard } from '@modules/auth/guards/jwt/auth.jwt.refresh.guard';
import { IAuthJwtAccessTokenPayload } from '@modules/auth/interfaces/auth.interface';

/**
 * Parameter decorator to extract JWT payload from the authenticated user
 * Can extract the entire user payload or a specific property from it.
 *
 * @param data - Optional property name to extract from user payload
 * @param ctx - Execution context containing the request information
 * @returns The user payload or a specific property from it
 */
export const AuthJwtPayload = createParamDecorator(
    <T = IAuthJwtAccessTokenPayload>(
        data: string,
        ctx: ExecutionContext
    ): T | undefined => {
        const { user } = ctx
            .switchToHttp()
            .getRequest<IRequestApp & { user: T }>();
        return data ? user[data] : user;
    }
);

/**
 * Parameter decorator to extract the raw JWT token from the Authorization header
 * Parses the Authorization header and returns the token part (without the prefix).
 *
 * @param _ - Unused parameter
 * @param ctx - Execution context containing the request information
 * @returns The JWT token string or undefined if not found
 */
export const AuthJwtToken = createParamDecorator(
    (_: unknown, ctx: ExecutionContext): string | undefined => {
        const { headers } = ctx.switchToHttp().getRequest<IRequestApp>();
        const { authorization } = headers;
        const authorizations: string[] = authorization?.split(' ') ?? [];

        return authorizations.length >= 2 ? authorizations[1] : undefined;
    }
);

/**
 * Method decorator to protect routes with JWT access token authentication
 * Applies the AuthJwtAccessGuard to the decorated method or class.
 *
 * @returns A method decorator that applies JWT access token protection
 */
export function AuthJwtAccessProtected(): MethodDecorator {
    return applyDecorators(UseGuards(AuthJwtAccessGuard));
}

/**
 * Method decorator to protect routes with JWT refresh token authentication
 * Applies the AuthJwtRefreshGuard to the decorated method or class.
 * Used specifically for token refresh endpoints.
 *
 * @returns A method decorator that applies JWT refresh token protection
 */
export function AuthJwtRefreshProtected(): MethodDecorator {
    return applyDecorators(UseGuards(AuthJwtRefreshGuard));
}
