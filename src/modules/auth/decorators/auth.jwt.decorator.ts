import { applyDecorators, UseGuards } from '@nestjs/common';
import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import { IRequestApp } from '@common/request/interfaces/request.interface';
import { AuthJwtAccessGuard } from '@modules/auth/guards/jwt/auth.jwt.access.guard';
import { AuthJwtRefreshGuard } from '@modules/auth/guards/jwt/auth.jwt.refresh.guard';
import { IAuthJwtAccessTokenPayload } from '@modules/auth/interfaces/auth.interface';

export const AuthJwtPayload = createParamDecorator(
    <T = IAuthJwtAccessTokenPayload>(
        data: string,
        ctx: ExecutionContext
    ): T => {
        const { user } = ctx
            .switchToHttp()
            .getRequest<IRequestApp & { user: T }>();
        return data ? user[data] : user;
    }
);

export const AuthJwtToken = createParamDecorator(
    (_: unknown, ctx: ExecutionContext): string => {
        const { headers } = ctx.switchToHttp().getRequest<IRequestApp>();
        const { authorization } = headers;
        const authorizations: string[] = authorization?.split(' ') ?? [];

        return authorizations.length >= 2 ? authorizations[1] : undefined;
    }
);

export function AuthJwtAccessProtected(): MethodDecorator {
    return applyDecorators(UseGuards(AuthJwtAccessGuard));
}

export function AuthJwtRefreshProtected(): MethodDecorator {
    return applyDecorators(UseGuards(AuthJwtRefreshGuard));
}
