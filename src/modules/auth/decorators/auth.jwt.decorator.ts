import { UseGuards, applyDecorators } from '@nestjs/common';
import type { ExecutionContext } from '@nestjs/common';
import { createParamDecorator } from '@nestjs/common';
import type { IRequestApp } from '@common/request/interfaces/request.interface';
import { AuthJwtAccessGuard } from '@modules/auth/guards/jwt/auth.jwt.access.guard';
import { AuthJwtRefreshGuard } from '@modules/auth/guards/jwt/auth.jwt.refresh.guard';
import type { IAuthJwtAccessTokenPayload } from '@modules/auth/interfaces/auth.interface';

/**
 * Extracts the JWT payload (or a single property of it) from the authenticated request.
 * @public
 */
export const AuthJwtPayload = createParamDecorator(
    <T = IAuthJwtAccessTokenPayload>(
        data: string,
        ctx: ExecutionContext
    ): T | undefined => {
        const { user } = ctx
            .switchToHttp()
            .getRequest<IRequestApp & { user: T }>();
        return data ? (user?.[data as keyof T] as T | undefined) : user;
    }
);

/**
 * Extracts the raw JWT token from the Authorization header, stripping the scheme prefix.
 * @public
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
 * Protects a route with JWT access token authentication.
 * @public
 */
export function AuthJwtAccessProtected(): MethodDecorator {
    return applyDecorators(UseGuards(AuthJwtAccessGuard));
}

/**
 * Protects a route with JWT refresh token authentication; used by token refresh endpoints.
 * @public
 */
export function AuthJwtRefreshProtected(): MethodDecorator {
    return applyDecorators(UseGuards(AuthJwtRefreshGuard));
}
