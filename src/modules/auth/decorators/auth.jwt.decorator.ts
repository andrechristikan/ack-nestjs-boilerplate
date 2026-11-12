import { UseGuards, applyDecorators } from '@nestjs/common';
import type { ExecutionContext } from '@nestjs/common';
import { createParamDecorator } from '@nestjs/common';
import { ApiBearerAuth } from '@nestjs/swagger';
import type { IRequestApp } from '@common/request/interfaces/request.interface';
import {
    AuthJwtAccessDocSecurityName,
    AuthJwtAccessProtectedDocErrors,
    AuthJwtRefreshDocSecurityName,
    AuthJwtRefreshProtectedDocErrors,
} from '@modules/auth/constants/auth.constant';
import { DocErrors } from '@common/doc/decorators/doc.decorator';
import { AuthJwtAccessGuard } from '@modules/auth/guards/jwt/auth.jwt.access.guard';
import { AuthJwtRefreshGuard } from '@modules/auth/guards/jwt/auth.jwt.refresh.guard';

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
