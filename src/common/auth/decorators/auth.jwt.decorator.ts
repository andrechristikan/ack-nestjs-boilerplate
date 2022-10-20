import { applyDecorators, SetMetadata, UseGuards } from '@nestjs/common';
import {
    AUTH_ACCESS_FOR_META_KEY,
    AUTH_PERMISSION_META_KEY,
} from 'src/common/auth/constants/auth.constant';
import { ENUM_AUTH_ACCESS_FOR } from 'src/common/auth/constants/auth.enum.constant';
import { ENUM_AUTH_PERMISSIONS } from 'src/common/auth/constants/auth.enum.permission.constant';
import { JwtRefreshGuard } from 'src/common/auth/guards/jwt-refresh/auth.jwt-refresh.guard';
import { JwtGuard } from 'src/common/auth/guards/jwt/auth.jwt.guard';
import { AuthPayloadAccessForGuard } from 'src/common/auth/guards/payload/auth.payload.access-for.guard';
import { AuthPayloadPermissionGuard } from 'src/common/auth/guards/payload/auth.payload.permission.guard';

export function AuthJwtGuard(...permissions: ENUM_AUTH_PERMISSIONS[]): any {
    return applyDecorators(
        UseGuards(JwtGuard, AuthPayloadPermissionGuard),
        SetMetadata(AUTH_PERMISSION_META_KEY, permissions)
    );
}

export function AuthPublicJwtGuard(
    ...permissions: ENUM_AUTH_PERMISSIONS[]
): any {
    return applyDecorators(
        UseGuards(
            JwtGuard,
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
