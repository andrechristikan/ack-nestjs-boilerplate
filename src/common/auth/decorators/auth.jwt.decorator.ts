import { applyDecorators, SetMetadata, UseGuards } from '@nestjs/common';
import {
    AUTH_ACCESS_FOR_META_KEY,
    AUTH_PERMISSION_META_KEY,
} from '../constants/auth.constant';
import { ENUM_AUTH_ACCESS_FOR } from '../constants/auth.enum.constant';
import { ENUM_AUTH_PERMISSIONS } from '../constants/auth.enum.permission.constant';
import { JwtRefreshGuard } from '../guards/jwt-refresh/auth.jwt-refresh.guard';
import { JwtGuard } from '../guards/jwt/auth.jwt.guard';
import { AuthPayloadAccessForGuard } from '../guards/payload/auth.payload.access-for.guard';
import { AuthPayloadDefaultGuard } from '../guards/payload/auth.payload.default.guard';
import { AuthPayloadPasswordExpiredGuard } from '../guards/payload/auth.payload.password-expired.guard';
import { AuthPayloadPermissionGuard } from '../guards/payload/auth.payload.permission.guard';

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
