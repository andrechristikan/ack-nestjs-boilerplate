import {
    Injectable,
    CanActivate,
    ExecutionContext,
    BadRequestException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Debugger } from 'src/debugger/debugger.decorator';
import { Logger as DebuggerService } from 'winston';
import {
    ENUM_PERMISSION_STATUS_CODE_ERROR,
    PERMISSION_ACTIVE_META_KEY,
} from '../permission.constant';

@Injectable()
export class PermissionActiveGuard implements CanActivate {
    constructor(
        @Debugger() private readonly debuggerService: DebuggerService,
        private reflector: Reflector
    ) {}

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
            this.debuggerService.error('Permission active error', {
                class: 'PermissionActiveGuard',
                function: 'canActivate',
            });

            throw new BadRequestException({
                statusCode:
                    ENUM_PERMISSION_STATUS_CODE_ERROR.PERMISSION_ACTIVE_ERROR,
                message: 'permission.error.active',
            });
        }
        return true;
    }
}
