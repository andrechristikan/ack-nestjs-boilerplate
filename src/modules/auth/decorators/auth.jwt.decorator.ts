import { ExecutionContext, UseGuards, applyDecorators } from '@nestjs/common';
import { createParamDecorator } from '@nestjs/common';
import { IRequestApp } from '@common/request/interfaces/request.interface';
import { AuthJwtAccessGuard } from '@modules/auth/guards/jwt/auth.jwt.access.guard';
import { AuthJwtRefreshGuard } from '@modules/auth/guards/jwt/auth.jwt.refresh.guard';
import { IAuthJwtAccessTokenPayload } from '@modules/auth/interfaces/auth.interface';

/** Extracts the JWT payload (or a single property of it) from the authenticated request. */
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

/** Extracts the raw JWT token from the Authorization header, stripping the scheme prefix. */
export const AuthJwtToken = createParamDecorator(
    (_: unknown, ctx: ExecutionContext): string | undefined => {
        const { headers } = ctx.switchToHttp().getRequest<IRequestApp>();
        const { authorization } = headers;
        const authorizations: string[] = authorization?.split(' ') ?? [];

        return authorizations.length >= 2 ? authorizations[1] : undefined;
    }
);

/** Protects a route with JWT access token authentication. */
export function AuthJwtAccessProtected(): MethodDecorator {
    return applyDecorators(UseGuards(AuthJwtAccessGuard));
}

/** Protects a route with JWT refresh token authentication; used by token refresh endpoints. */
export function AuthJwtRefreshProtected(): MethodDecorator {
    return applyDecorators(UseGuards(AuthJwtRefreshGuard));
}
