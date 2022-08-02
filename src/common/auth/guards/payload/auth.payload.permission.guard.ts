import {
    Injectable,
    CanActivate,
    ExecutionContext,
    ForbiddenException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { IAuthPermission } from '../../auth.interface';
import {
    AUTH_PERMISSION_META_KEY,
    ENUM_AUTH_ACCESS_FOR,
} from '../../constants/auth.constant';
import { ENUM_AUTH_PERMISSIONS } from '../../constants/auth.permission.constant';
import { ENUM_AUTH_STATUS_CODE_ERROR } from '../../constants/auth.status-code.constant';

@Injectable()
export class AuthPayloadPermissionGuard implements CanActivate {
    constructor(private reflector: Reflector) {}

    async canActivate(context: ExecutionContext): Promise<boolean> {
        const requiredPermission: ENUM_AUTH_PERMISSIONS[] =
            this.reflector.getAllAndOverride<ENUM_AUTH_PERMISSIONS[]>(
                AUTH_PERMISSION_META_KEY,
                [context.getHandler(), context.getClass()]
            );
        if (!requiredPermission) {
            return true;
        }

        const { user } = context.switchToHttp().getRequest();
        const { role } = user;
        if (role.accessFor === ENUM_AUTH_ACCESS_FOR.SUPER_ADMIN) {
            return true;
        }

        const permissions: string[] = role.permissions
            .filter((val: IAuthPermission) => val.isActive)
            .map((val: IAuthPermission) => val.code);

        const hasPermission: boolean = requiredPermission.every((permission) =>
            permissions.includes(permission)
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
