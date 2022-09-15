import {
    applyDecorators,
    HttpStatus,
    SetMetadata,
    UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth } from '@nestjs/swagger';
import {
    AUTH_ACCESS_FOR_META_KEY,
    AUTH_PERMISSION_META_KEY,
} from 'src/common/auth/constants/auth.constant';
import { ENUM_AUTH_ACCESS_FOR } from 'src/common/auth/constants/auth.enum.constant';
import { ENUM_AUTH_PERMISSIONS } from 'src/common/auth/constants/auth.enum.permission.constant';
import { JwtRefreshGuard } from 'src/common/auth/guards/jwt-refresh/auth.jwt-refresh.guard';
import { JwtGuard } from 'src/common/auth/guards/jwt/auth.jwt.guard';
import { AuthPayloadAccessForGuard } from 'src/common/auth/guards/payload/auth.payload.access-for.guard';
import { AuthPayloadDefaultGuard } from 'src/common/auth/guards/payload/auth.payload.default.guard';
import { AuthPayloadPasswordExpiredGuard } from 'src/common/auth/guards/payload/auth.payload.password-expired.guard';
import { AuthPayloadPermissionGuard } from 'src/common/auth/guards/payload/auth.payload.permission.guard';
import { ResponseDoc } from 'src/common/response/decorators/response.decorator';

export function AuthJwtGuard(...permissions: ENUM_AUTH_PERMISSIONS[]): any {
    return applyDecorators(
        ApiBearerAuth('accessToken'),
        ResponseDoc({
            httpStatus: HttpStatus.UNAUTHORIZED,
        }),
        ResponseDoc({
            httpStatus: HttpStatus.FORBIDDEN,
        }),
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
        ApiBearerAuth('accessToken'),
        ResponseDoc({
            httpStatus: HttpStatus.UNAUTHORIZED,
        }),
        ResponseDoc({
            httpStatus: HttpStatus.FORBIDDEN,
        }),
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
        ApiBearerAuth('accessToken'),
        ResponseDoc({
            httpStatus: HttpStatus.UNAUTHORIZED,
        }),
        ResponseDoc({
            httpStatus: HttpStatus.FORBIDDEN,
        }),
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
    return applyDecorators(
        ApiBearerAuth('refreshToken'),
        ResponseDoc({
            httpStatus: HttpStatus.UNAUTHORIZED,
        }),
        ResponseDoc({
            httpStatus: HttpStatus.FORBIDDEN,
        }),
        UseGuards(JwtRefreshGuard)
    );
}
