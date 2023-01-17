import {
    Injectable,
    CanActivate,
    ExecutionContext,
    ForbiddenException,
    UnauthorizedException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { AUTH_PERMISSION_META_KEY } from 'src/common/auth/constants/auth.constant';
import { ENUM_AUTH_ACCESS_FOR } from 'src/common/auth/constants/auth.enum.constant';
import { ENUM_AUTH_PERMISSIONS } from 'src/common/auth/constants/auth.enum.permission.constant';
import { ENUM_AUTH_STATUS_CODE_ERROR } from 'src/common/auth/constants/auth.status-code.constant';
import { HelperArrayService } from 'src/common/helper/services/helper.array.service';

@Injectable()
export class AuthPayloadPermissionGuard implements CanActivate {
    constructor(
        private readonly reflector: Reflector,
        private readonly helperArrayService: HelperArrayService
    ) {}

    async canActivate(context: ExecutionContext): Promise<boolean> {
        const requiredPermission: ENUM_AUTH_PERMISSIONS[] =
            this.reflector.getAllAndOverride<ENUM_AUTH_PERMISSIONS[]>(
                AUTH_PERMISSION_META_KEY,
                [context.getHandler(), context.getClass()]
            );

        const { permissions, user } = context.switchToHttp().getRequest();
        if (!user) {
            throw new UnauthorizedException({
                statusCode:
                    ENUM_AUTH_STATUS_CODE_ERROR.AUTH_JWT_ACCESS_TOKEN_ERROR,
                message: 'auth.error.accessTokenUnauthorized',
            });
        } else if (
            !requiredPermission ||
            user.accessFor === ENUM_AUTH_ACCESS_FOR.SUPER_ADMIN
        ) {
            return true;
        }

        const hasPermission: boolean = this.helperArrayService.in(
            permissions,
            requiredPermission
        );

        if (!hasPermission) {
            throw new ForbiddenException({
                statusCode:
                    ENUM_AUTH_STATUS_CODE_ERROR.AUTH_PERMISSION_INVALID_ERROR,
                message: 'auth.error.permissionForbidden',
            });
        }
        return hasPermission;
    }
}
