import { UseGuards, applyDecorators } from '@nestjs/common';
import type { ExecutionContext } from '@nestjs/common';
import { createParamDecorator } from '@nestjs/common';
import { ApiBearerAuth } from '@nestjs/swagger';
import type { IRequestApp } from '@common/request/interfaces/request.interface';
import { RequestContextMissingException } from '@common/request/exceptions/request.context-missing.exception';
import { AuthJwtGuardMissingException } from '@modules/auth/exceptions/auth.jwt-guard-missing.exception';
import {
    AuthJwtAccessDocSecurityName,
    AuthJwtAccessProtectedDocErrors,
    AuthJwtRefreshDocSecurityName,
    AuthJwtRefreshProtectedDocErrors,
} from '@modules/auth/constants/auth.constant';
import { DocErrors } from '@common/doc/decorators/doc.decorator';
import { AuthJwtAccessGuard } from '@modules/auth/guards/jwt/auth.jwt.access.guard';
import { AuthJwtRefreshGuard } from '@modules/auth/guards/jwt/auth.jwt.refresh.guard';
import type {
    IAuthJwtAccessTokenPayload,
    IAuthJwtPayloadField,
} from '@modules/auth/interfaces/auth.interface';

/** @public */
export const AuthJwtPayload: <T = IAuthJwtAccessTokenPayload>(
    field?: IAuthJwtPayloadField<T>
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

/** @public */
export const AuthJwtToken = createParamDecorator(
    (_: unknown, ctx: ExecutionContext): string | null => {
        const { headers } = ctx.switchToHttp().getRequest<IRequestApp>();
        const { authorization } = headers;
        const authorizations: string[] = authorization?.split(' ') ?? [];

        return authorizations[1] ?? null;
    }
);

/** @public */
export function AuthJwtAccessProtected(): MethodDecorator {
    return applyDecorators(
        UseGuards(AuthJwtAccessGuard),
        ApiBearerAuth(AuthJwtAccessDocSecurityName),
        DocErrors(...AuthJwtAccessProtectedDocErrors)
    );
}

/** @public */
export function AuthJwtRefreshProtected(): MethodDecorator {
    return applyDecorators(
        UseGuards(AuthJwtRefreshGuard),
        ApiBearerAuth(AuthJwtRefreshDocSecurityName),
        DocErrors(...AuthJwtRefreshProtectedDocErrors)
    );
}
