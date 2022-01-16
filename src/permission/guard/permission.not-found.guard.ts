import {
    Injectable,
    CanActivate,
    ExecutionContext,
    NotFoundException,
} from '@nestjs/common';
import { Debugger } from 'src/debugger/debugger.decorator';
import { Logger as DebuggerService } from 'winston';
import { ENUM_PERMISSION_STATUS_CODE_ERROR } from '../permission.constant';

@Injectable()
export class PermissionNotFoundGuard implements CanActivate {
    constructor(
        @Debugger() private readonly debuggerService: DebuggerService
    ) {}

    async canActivate(context: ExecutionContext): Promise<boolean> {
        const { __permission } = context.switchToHttp().getRequest();

        if (!__permission) {
            this.debuggerService.error('Permission not found', {
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
