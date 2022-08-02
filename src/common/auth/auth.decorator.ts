import {
    UseGuards,
    createParamDecorator,
    ExecutionContext,
    applyDecorators,
    SetMetadata,
} from '@nestjs/common';
import {
    AUTH_ACCESS_FOR_META_KEY,
    AUTH_EXCLUDE_API_KEY_META_KEY,
    AUTH_PERMISSION_META_KEY,
    ENUM_AUTH_ACCESS_FOR,
} from './constants/auth.constant';
import { ENUM_AUTH_PERMISSIONS } from './constants/auth.permission.constant';
import { BasicGuard } from './guards/basic/auth.basic.guard';
import { JwtRefreshGuard } from './guards/jwt-refresh/auth.jwt-refresh.guard';
import { JwtGuard } from './guards/jwt/auth.jwt.guard';
import { AuthPayloadAccessForGuard } from './guards/payload/auth.payload.access-for.guard';
import { AuthPayloadDefaultGuard } from './guards/payload/auth.payload.default.guard';
import { AuthPayloadPasswordExpiredGuard } from './guards/payload/auth.payload.password-expired.guard';
import { AuthPayloadPermissionGuard } from './guards/payload/auth.payload.permission.guard';

export function AuthJwtGuard(...permissions: ENUM_AUTH_PERMISSIONS[]): any {
    return applyDecorators(
        UseGuards(
            JwtGuard,
            AuthPayloadDefaultGuard,
            AuthPayloadPermissionGuard
        ),
        SetMetadata(AUTH_PERMISSION_META_KEY, permissions)
    );
}

export function AuthPublicJwtGuard(
    ...permissions: ENUM_AUTH_PERMISSIONS[]
): any {
    return applyDecorators(
        UseGuards(
            JwtGuard,
            AuthPayloadDefaultGuard,
            AuthPayloadPasswordExpiredGuard,
            AuthPayloadAccessForGuard,
            AuthPayloadPermissionGuard
        ),
        SetMetadata(AUTH_PERMISSION_META_KEY, permissions),
        SetMetadata(AUTH_ACCESS_FOR_META_KEY, [ENUM_AUTH_ACCESS_FOR.USER])
    );
}

export function AuthAdminJwtGuard(...permissions: ENUM_AUTH_PERMISSIONS[]) {
    return applyDecorators(
        UseGuards(
            JwtGuard,
            AuthPayloadDefaultGuard,
            AuthPayloadPasswordExpiredGuard,
            AuthPayloadAccessForGuard,
            AuthPayloadPermissionGuard
        ),
        SetMetadata(AUTH_PERMISSION_META_KEY, permissions),
        SetMetadata(AUTH_ACCESS_FOR_META_KEY, [
            ENUM_AUTH_ACCESS_FOR.SUPER_ADMIN,
            ENUM_AUTH_ACCESS_FOR.ADMIN,
        ])
    );
}

export function AuthRefreshJwtGuard(): any {
    return applyDecorators(UseGuards(JwtRefreshGuard));
}

export function AuthBasicGuard(): any {
    return applyDecorators(UseGuards(BasicGuard));
}

export const AuthExcludeApiKey = () =>
    SetMetadata(AUTH_EXCLUDE_API_KEY_META_KEY, true);

export const User = createParamDecorator(
    (data: string, ctx: ExecutionContext): Record<string, any> => {
        const { user } = ctx.switchToHttp().getRequest();
        return data ? user[data] : user;
    }
);

export const ApiKey = createParamDecorator(
    (data: string, ctx: ExecutionContext): Record<string, any> => {
        const { apiKey } = ctx.switchToHttp().getRequest();
        return data ? apiKey[data] : apiKey;
    }
);

export const Token = createParamDecorator(
    (data: string, ctx: ExecutionContext): string => {
        const { headers } = ctx.switchToHttp().getRequest();
        const { authorization } = headers;
        return authorization ? authorization.split(' ')[1] : undefined;
    }
);
