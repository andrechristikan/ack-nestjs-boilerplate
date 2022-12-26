import {
    Injectable,
    CanActivate,
    ExecutionContext,
    BadRequestException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { PERMISSION_ACTIVE_META_KEY } from 'src/modules/permission/constants/permission.constant';
import { ENUM_PERMISSION_STATUS_CODE_ERROR } from 'src/modules/permission/constants/permission.status-code.constant';

@Injectable()
export class PermissionActiveGuard implements CanActivate {
    constructor(private reflector: Reflector) {}

    async canActivate(context: ExecutionContext): Promise<boolean> {
        const required: boolean[] = this.reflector.getAllAndOverride<boolean[]>(
            PERMISSION_ACTIVE_META_KEY,
            [context.getHandler(), context.getClass()]
        );

        if (!required) {
            return true;
        }

        const { __permission } = context.switchToHttp().getRequest();

        if (!required.includes(__permission.isActive)) {
            throw new BadRequestException({
                statusCode:
                    ENUM_PERMISSION_STATUS_CODE_ERROR.PERMISSION_IS_ACTIVE_ERROR,
                message: 'permission.error.isActiveInvalid',
            });
        }
        return true;
    }
}
