import {
    Injectable,
    CanActivate,
    ExecutionContext,
    NotFoundException,
} from '@nestjs/common';
import { DebuggerService } from 'src/debugger/service/debugger.service';
import { ENUM_PERMISSION_STATUS_CODE_ERROR } from '../permission.constant';

@Injectable()
export class PermissionNotFoundGuard implements CanActivate {
    constructor(private readonly debuggerService: DebuggerService) {}

    async canActivate(context: ExecutionContext): Promise<boolean> {
        const { __permission, id } = context.switchToHttp().getRequest();

        if (!__permission) {
            this.debuggerService.error(id, {
                description: 'Permission not found',
                class: 'PermissionNotFoundGuard',
                function: 'canActivate',
            });

            throw new NotFoundException({
                statusCode:
                    ENUM_PERMISSION_STATUS_CODE_ERROR.PERMISSION_NOT_FOUND_ERROR,
                message: 'permission.error.notFound',
            });
        }
        return true;
    }
}
