import {
    Injectable,
    CanActivate,
    ExecutionContext,
    BadRequestException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { DebuggerService } from 'src/debugger/service/debugger.service';
import {
    ENUM_USER_STATUS_CODE_ERROR,
    USER_ACTIVE_META_KEY,
} from '../user.constant';

@Injectable()
export class UserActiveGuard implements CanActivate {
    constructor(
        private readonly debuggerService: DebuggerService,
        private reflector: Reflector
    ) {}

    async canActivate(context: ExecutionContext): Promise<boolean> {
        const required: boolean[] = this.reflector.getAllAndOverride<boolean[]>(
            USER_ACTIVE_META_KEY,
            [context.getHandler(), context.getClass()]
        );

        if (!required) {
            return true;
        }

        const { __user, id } = context.switchToHttp().getRequest();

        if (!required.includes(__user.isActive)) {
            this.debuggerService.error(id, {
                description: 'User active error',
                class: 'UserActiveGuard',
                function: 'canActivate',
            });

            throw new BadRequestException({
                statusCode: ENUM_USER_STATUS_CODE_ERROR.USER_ACTIVE_ERROR,
                message: 'user.error.active',
            });
        }
        return true;
    }
}
