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
import { ENUM_AUTH_STATUS_CODE_ERROR } from 'src/common/auth/constants/auth.status-code.constant';
import { JwtRefreshGuard } from 'src/common/auth/guards/jwt-refresh/auth.jwt-refresh.guard';
import { JwtGuard } from 'src/common/auth/guards/jwt/auth.jwt.guard';
import { AuthPayloadAccessForGuard } from 'src/common/auth/guards/payload/auth.payload.access-for.guard';
import { AuthPayloadDefaultGuard } from 'src/common/auth/guards/payload/auth.payload.default.guard';
import { AuthPayloadPasswordExpiredGuard } from 'src/common/auth/guards/payload/auth.payload.password-expired.guard';
import { AuthPayloadPermissionGuard } from 'src/common/auth/guards/payload/auth.payload.permission.guard';
import {
    ResponseDoc,
    ResponseDocOneOf,
} from 'src/common/response/decorators/response.decorator';

export function AuthJwtGuard(...permissions: ENUM_AUTH_PERMISSIONS[]): any {
    return applyDecorators(
        ApiBearerAuth('accessToken'),
        ResponseDoc({
            httpStatus: HttpStatus.UNAUTHORIZED,
            messagePath: 'http.clientError.unauthorized',
            statusCode: ENUM_AUTH_STATUS_CODE_ERROR.AUTH_JWT_ACCESS_TOKEN_ERROR,
        }),
        ResponseDocOneOf(
            HttpStatus.FORBIDDEN,
            {
                statusCode:
                    ENUM_AUTH_STATUS_CODE_ERROR.AUTH_PERMISSION_INVALID_ERROR,
                messagePath: 'auth.error.permissionForbidden',
            },
            {
                statusCode:
                    ENUM_AUTH_STATUS_CODE_ERROR.AUTH_PASSWORD_EXPIRED_ERROR,
                messagePath: 'auth.error.passwordExpired',
            },
            {
                statusCode:
                    ENUM_AUTH_STATUS_CODE_ERROR.AUTH_ACCESS_FOR_INVALID_ERROR,
                messagePath: 'auth.error.accessForForbidden',
            },
            {
                statusCode: ENUM_AUTH_STATUS_CODE_ERROR.AUTH_INACTIVE_ERROR,
                messagePath: 'auth.error.blocked',
            },
            {
                statusCode:
                    ENUM_AUTH_STATUS_CODE_ERROR.AUTH_ROLE_INACTIVE_ERROR,
                messagePath: 'auth.error.roleBlocked',
            }
        ),
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
            messagePath: 'http.clientError.unauthorized',
            statusCode: ENUM_AUTH_STATUS_CODE_ERROR.AUTH_JWT_ACCESS_TOKEN_ERROR,
        }),
        ResponseDocOneOf(
            HttpStatus.FORBIDDEN,
            {
                statusCode:
                    ENUM_AUTH_STATUS_CODE_ERROR.AUTH_PERMISSION_INVALID_ERROR,
                messagePath: 'auth.error.permissionForbidden',
            },
            {
                statusCode:
                    ENUM_AUTH_STATUS_CODE_ERROR.AUTH_PASSWORD_EXPIRED_ERROR,
                messagePath: 'auth.error.passwordExpired',
            },
            {
                statusCode:
                    ENUM_AUTH_STATUS_CODE_ERROR.AUTH_ACCESS_FOR_INVALID_ERROR,
                messagePath: 'auth.error.accessForForbidden',
            },
            {
                statusCode: ENUM_AUTH_STATUS_CODE_ERROR.AUTH_INACTIVE_ERROR,
                messagePath: 'auth.error.blocked',
            },
            {
                statusCode:
                    ENUM_AUTH_STATUS_CODE_ERROR.AUTH_ROLE_INACTIVE_ERROR,
                messagePath: 'auth.error.roleBlocked',
            }
        ),
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
            messagePath: 'http.clientError.unauthorized',
            statusCode: ENUM_AUTH_STATUS_CODE_ERROR.AUTH_JWT_ACCESS_TOKEN_ERROR,
        }),
        ResponseDocOneOf(
            HttpStatus.FORBIDDEN,
            {
                statusCode:
                    ENUM_AUTH_STATUS_CODE_ERROR.AUTH_PERMISSION_INVALID_ERROR,
                messagePath: 'auth.error.permissionForbidden',
            },
            {
                statusCode:
                    ENUM_AUTH_STATUS_CODE_ERROR.AUTH_PASSWORD_EXPIRED_ERROR,
                messagePath: 'auth.error.passwordExpired',
            },
            {
                statusCode:
                    ENUM_AUTH_STATUS_CODE_ERROR.AUTH_ACCESS_FOR_INVALID_ERROR,
                messagePath: 'auth.error.accessForForbidden',
            },
            {
                statusCode: ENUM_AUTH_STATUS_CODE_ERROR.AUTH_INACTIVE_ERROR,
                messagePath: 'auth.error.blocked',
            },
            {
                statusCode:
                    ENUM_AUTH_STATUS_CODE_ERROR.AUTH_ROLE_INACTIVE_ERROR,
                messagePath: 'auth.error.roleBlocked',
            }
        ),
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
            messagePath: 'http.clientError.unauthorized',
            statusCode:
                ENUM_AUTH_STATUS_CODE_ERROR.AUTH_JWT_REFRESH_TOKEN_ERROR,
        }),
        UseGuards(JwtRefreshGuard)
    );
}
