import {
    Injectable,
    CanActivate,
    ExecutionContext,
    NotFoundException,
} from '@nestjs/common';
import { ENUM_PERMISSION_STATUS_CODE_ERROR } from '../constants/permission.status-code.constant';

@Injectable()
export class PermissionNotFoundGuard implements CanActivate {
    async canActivate(context: ExecutionContext): Promise<boolean> {
        const { __permission } = context.switchToHttp().getRequest();

        if (!__permission) {
            throw new NotFoundException({
                statusCode:
                    ENUM_PERMISSION_STATUS_CODE_ERROR.PERMISSION_NOT_FOUND_ERROR,
                message: 'permission.error.notFound',
            });
        }
        return true;
    }
}
