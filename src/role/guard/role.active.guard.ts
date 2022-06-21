import {
    Injectable,
    CanActivate,
    ExecutionContext,
    BadRequestException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { DebuggerService } from 'src/debugger/service/debugger.service';
import {
    ENUM_ROLE_STATUS_CODE_ERROR,
    ROLE_ACTIVE_META_KEY,
} from '../role.constant';

@Injectable()
export class RoleActiveGuard implements CanActivate {
    constructor(
        private readonly debuggerService: DebuggerService,
        private reflector: Reflector
    ) {}

    async canActivate(context: ExecutionContext): Promise<boolean> {
        const required: boolean[] = this.reflector.getAllAndOverride<boolean[]>(
            ROLE_ACTIVE_META_KEY,
            [context.getHandler(), context.getClass()]
        );

        if (!required) {
            return true;
        }

        const { __role, id } = context.switchToHttp().getRequest();

        if (!required.includes(__role.isActive)) {
            this.debuggerService.error(id, {
                description: 'Role active error',
                class: 'RoleActiveGuard',
                function: 'canActivate',
            });

            throw new BadRequestException({
                statusCode: ENUM_ROLE_STATUS_CODE_ERROR.ROLE_ACTIVE_ERROR,
                message: 'role.error.active',
            });
        }
        return true;
    }
}
