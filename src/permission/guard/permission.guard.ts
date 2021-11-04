import {
    Injectable,
    CanActivate,
    ExecutionContext,
    ForbiddenException
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import {
    ENUM_PERMISSIONS,
    ENUM_PERMISSION_STATUS_CODE_ERROR,
    PERMISSION_META_KEY
} from '../permission.constant';

@Injectable()
export class PermissionGuard implements CanActivate {
    constructor(private reflector: Reflector) {}

    async canActivate(context: ExecutionContext): Promise<boolean> {
        const requiredPermission: ENUM_PERMISSIONS[] = this.reflector.getAllAndOverride<
            ENUM_PERMISSIONS[]
        >(PERMISSION_META_KEY, [context.getHandler(), context.getClass()]);
        if (!requiredPermission) {
            return true;
        }

        const { user } = context.switchToHttp().getRequest();
        const { role } = user;
        const permissions = role.permissions
            .filter((val: Record<string, any>) => val.isActive)
            .map((val: Record<string, any>) => val.name);

        const hasPermission: boolean = requiredPermission.every((permission) =>
            permissions.includes(permission)
        );

        if (!hasPermission) {
            throw new ForbiddenException({
                statusCode:
                    ENUM_PERMISSION_STATUS_CODE_ERROR.PERMISSION_GUARD_INVALID_ERROR,
                message: 'http.clientError.forbidden'
            });
        }
        return hasPermission;
    }
}
