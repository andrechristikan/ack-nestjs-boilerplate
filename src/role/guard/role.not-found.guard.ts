import {
    Injectable,
    CanActivate,
    ExecutionContext,
    NotFoundException,
} from '@nestjs/common';
import { DebuggerService } from 'src/debugger/service/debugger.service';
import { ENUM_ROLE_STATUS_CODE_ERROR } from '../role.constant';

@Injectable()
export class RoleNotFoundGuard implements CanActivate {
    constructor(private readonly debuggerService: DebuggerService) {}

    async canActivate(context: ExecutionContext): Promise<boolean> {
        const { __role, id } = context.switchToHttp().getRequest();

        if (!__role) {
            this.debuggerService.error(id, {
                description: 'Role not found',
                class: 'RoleNotFoundGuard',
                function: 'canActivate',
            });

            throw new NotFoundException({
                statusCode: ENUM_ROLE_STATUS_CODE_ERROR.ROLE_NOT_FOUND_ERROR,
                message: 'role.error.notFound',
            });
        }

        return true;
    }
}
