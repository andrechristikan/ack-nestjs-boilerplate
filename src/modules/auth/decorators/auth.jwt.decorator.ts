import { UseGuards, applyDecorators } from '@nestjs/common';
import type { ExecutionContext } from '@nestjs/common';
import { createParamDecorator } from '@nestjs/common';
import { ApiBearerAuth } from '@nestjs/swagger';
import type { IRequestApp } from '@common/request/interfaces/request.interface';
import { RequestContextMissingException } from '@common/request/exceptions/request.context-missing.exception';
import { AuthJwtGuardMissingException } from '@modules/auth/exceptions/auth.jwt-guard-missing.exception';
import {
    AuthJwtAccessDocSecurityName,
    AuthJwtRefreshDocSecurityName,
    DocAuthJwtAccessErrorResponses,
    DocAuthJwtRefreshErrorResponses,
} from '@modules/auth/constants/auth.constant';
import { AuthJwtAccessGuard } from '@modules/auth/guards/jwt/auth.jwt.access.guard';
import { AuthJwtRefreshGuard } from '@modules/auth/guards/jwt/auth.jwt.refresh.guard';
import type { IAuthJwtAccessTokenPayload } from '@modules/auth/interfaces/auth.interface';

/**
 * Reads the JWT payload, or one of its fields, that the authenticating guard wrote to the request; throws `AuthJwtGuardMissingException` when the request carries no payload and `RequestContextMissingException` when the requested field is null.
 * @public
 */
export const AuthJwtPayload: <T = IAuthJwtAccessTokenPayload>(
    field?: Extract<keyof T, string>
) => ParameterDecorator = createParamDecorator<string | undefined, unknown>(
    (field: string | undefined, ctx: ExecutionContext): unknown => {
        const user =
            ctx
                .switchToHttp()
                .getRequest<IRequestApp<Record<string, unknown>>>().user ??
            null;
        if (user === null) {
            throw new AuthJwtGuardMissingException();
        }

        const fieldKey = field ?? null;
        if (fieldKey === null) {
            return user;
        }

        const value = user[fieldKey] ?? null;
        if (value === null) {
            throw new RequestContextMissingException(`request.user.${field}`);
        }

        return value;
    }
);

/**
 * Extracts the raw JWT token from the Authorization header, stripping the scheme prefix.
 * @public
 */
export const AuthJwtToken = createParamDecorator(
    (_: unknown, ctx: ExecutionContext): string | null => {
        const { headers } = ctx.switchToHttp().getRequest<IRequestApp>();
        const { authorization } = headers;
        const authorizations: string[] = authorization?.split(' ') ?? [];

        return authorizations[1] ?? null;
    }
);

/**
 * Protects a route with JWT access token authentication and documents Bearer access + kits.
 * @public
 */
export function AuthJwtAccessProtected(): MethodDecorator {
    return applyDecorators(
        UseGuards(AuthJwtAccessGuard),
        ApiBearerAuth(AuthJwtAccessDocSecurityName),
        DocAuthJwtAccessErrorResponses.unauthorized,
        DocAuthJwtAccessErrorResponses.unavailable
    );
}

/**
 * Protects a route with JWT refresh token authentication; used by token refresh endpoints.
 * @public
 */
export function AuthJwtRefreshProtected(): MethodDecorator {
    return applyDecorators(
        UseGuards(AuthJwtRefreshGuard),
        ApiBearerAuth(AuthJwtRefreshDocSecurityName),
        DocAuthJwtRefreshErrorResponses.unauthorized,
        DocAuthJwtRefreshErrorResponses.unavailable
    );
}
