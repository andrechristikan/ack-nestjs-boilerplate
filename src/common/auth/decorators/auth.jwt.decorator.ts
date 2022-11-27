import { applyDecorators, SetMetadata, UseGuards } from '@nestjs/common';
import {
    AUTH_ACCESS_FOR_META_KEY,
    AUTH_PERMISSION_META_KEY,
} from 'src/common/auth/constants/auth.constant';
import { ENUM_AUTH_ACCESS_FOR } from 'src/common/auth/constants/auth.enum.constant';
import { ENUM_AUTH_PERMISSIONS } from 'src/common/auth/constants/auth.enum.permission.constant';
import { AuthJwtAccessGuard } from 'src/common/auth/guards/jwt-access/auth.jwt-access.guard';
import { AuthJwtRefreshGuard } from 'src/common/auth/guards/jwt-refresh/auth.jwt-refresh.guard';
import { AuthPayloadAccessForGuard } from 'src/common/auth/guards/payload/auth.payload.access-for.guard';
import { AuthPayloadPermissionGuard } from 'src/common/auth/guards/payload/auth.payload.permission.guard';
import { createParamDecorator, ExecutionContext } from '@nestjs/common';

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

export function AuthJwtPermissionProtected(
    ...permissions: ENUM_AUTH_PERMISSIONS[]
): MethodDecorator {
    return applyDecorators(
        UseGuards(AuthPayloadPermissionGuard),
        SetMetadata(AUTH_PERMISSION_META_KEY, permissions)
    );
}

export function AuthJwtAccessProtected(): MethodDecorator {
    return applyDecorators(UseGuards(AuthJwtAccessGuard));
}

export function AuthJwtPublicAccessProtected(): MethodDecorator {
    return applyDecorators(
        UseGuards(AuthJwtAccessGuard, AuthPayloadAccessForGuard),
        SetMetadata(AUTH_ACCESS_FOR_META_KEY, [ENUM_AUTH_ACCESS_FOR.USER])
    );
}

export function AuthJwtAdminAccessProtected(): MethodDecorator {
    return applyDecorators(
        UseGuards(AuthJwtAccessGuard, AuthPayloadAccessForGuard),
        SetMetadata(AUTH_ACCESS_FOR_META_KEY, [
            ENUM_AUTH_ACCESS_FOR.SUPER_ADMIN,
            ENUM_AUTH_ACCESS_FOR.ADMIN,
        ])
    );
}

export function AuthJwtRefreshProtected(): MethodDecorator {
    return applyDecorators(UseGuards(AuthJwtRefreshGuard));
}
