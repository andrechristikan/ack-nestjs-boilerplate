import { UseGuards, applyDecorators } from '@nestjs/common';
import type { ExecutionContext } from '@nestjs/common';
import { createParamDecorator } from '@nestjs/common';
import type { IRequestApp } from '@common/request/interfaces/request.interface';
import { RequestContextMissingException } from '@common/request/exceptions/request.context-missing.exception';
import { AuthJwtAccessGuard } from '@modules/auth/guards/jwt/auth.jwt.access.guard';
import { AuthJwtRefreshGuard } from '@modules/auth/guards/jwt/auth.jwt.refresh.guard';
import type { IAuthJwtAccessTokenPayload } from '@modules/auth/interfaces/auth.interface';

const AuthJwtPayloadParam = createParamDecorator<string | null, unknown>(
    (field: string | null, ctx: ExecutionContext): unknown => {
        const { user } = ctx
            .switchToHttp()
            .getRequest<IRequestApp<Record<string, unknown>>>();
        if (!user) {
            throw new RequestContextMissingException('request.user');
        }

        return field === null ? user : user[field];
    }
);

/**
 * Reads the JWT payload, or one of its fields, that the authenticating guard wrote to the request.
 * @public
 */
export function AuthJwtPayload<
    T = IAuthJwtAccessTokenPayload,
    K extends Extract<keyof T, string> = Extract<keyof T, string>,
>(field?: K): ParameterDecorator {
    return AuthJwtPayloadParam(field ?? null);
}

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
