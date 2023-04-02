import { applyDecorators, SetMetadata, UseGuards } from '@nestjs/common';
import { AuthJwtAccessGuard } from 'src/common/auth/guards/jwt-access/auth.jwt-access.guard';
import { AuthJwtRefreshGuard } from 'src/common/auth/guards/jwt-refresh/auth.jwt-refresh.guard';
import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import { ENUM_AUTH_TYPE } from 'src/common/auth/constants/auth.enum.constant';
import { AUTH_TYPE_META_KEY } from 'src/common/auth/constants/auth.constant';
import { AuthPayloadTypeGuard } from 'src/common/auth/guards/payload/auth.payload.type.guard';

export const AuthJwtPayload = createParamDecorator(
    (data: string, ctx: ExecutionContext): Record<string, any> => {
        const { user } = ctx.switchToHttp().getRequest();
        return data ? user[data] : user;
    }
);

export const AuthJwtToken = createParamDecorator(
    (data: string, ctx: ExecutionContext): string => {
        const { headers } = ctx.switchToHttp().getRequest();
        const { authorization } = headers;
        const authorizations: string[] = authorization.split(' ');

        return authorizations.length >= 2 ? authorizations[1] : undefined;
    }
);

export function AuthJwtAccessProtected(): MethodDecorator {
    return applyDecorators(UseGuards(AuthJwtAccessGuard));
}

export function AuthJwtPublicAccessProtected(): MethodDecorator {
    return applyDecorators(
        UseGuards(AuthJwtAccessGuard, AuthPayloadTypeGuard),
        SetMetadata(AUTH_TYPE_META_KEY, [ENUM_AUTH_TYPE.USER])
    );
}

export function AuthJwtAdminAccessProtected(): MethodDecorator {
    return applyDecorators(
        UseGuards(AuthJwtAccessGuard, AuthPayloadTypeGuard),
        SetMetadata(AUTH_TYPE_META_KEY, [
            ENUM_AUTH_TYPE.SUPER_ADMIN,
            ENUM_AUTH_TYPE.ADMIN,
        ])
    );
}

export function AuthJwtRefreshProtected(): MethodDecorator {
    return applyDecorators(UseGuards(AuthJwtRefreshGuard));
}
