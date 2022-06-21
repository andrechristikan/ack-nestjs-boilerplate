import {
    Injectable,
    CanActivate,
    ExecutionContext,
    NotFoundException,
} from '@nestjs/common';
import { DebuggerService } from 'src/debugger/service/debugger.service';
import { ENUM_USER_STATUS_CODE_ERROR } from '../user.constant';

@Injectable()
export class UserNotFoundGuard implements CanActivate {
    constructor(private readonly debuggerService: DebuggerService) {}

    async canActivate(context: ExecutionContext): Promise<boolean> {
        const { __user, id } = context.switchToHttp().getRequest();

        if (!__user) {
            this.debuggerService.error(id, {
                description: 'User not found',
                class: 'UserNotFoundGuard',
                function: 'canActivate',
            });

            throw new NotFoundException({
                statusCode: ENUM_USER_STATUS_CODE_ERROR.USER_NOT_FOUND_ERROR,
                message: 'user.error.notFound',
            });
        }

        return true;
    }
}
