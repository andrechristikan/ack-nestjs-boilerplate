import {
    Injectable,
    CanActivate,
    ExecutionContext,
    ForbiddenException,
} from '@nestjs/common';
import { ENUM_AUTH_STATUS_CODE_ERROR } from 'src/auth/auth.constant';
import { DebuggerService } from 'src/debugger/service/debugger.service';

@Injectable()
export class AuthPayloadDefaultGuard implements CanActivate {
    constructor(private readonly debuggerService: DebuggerService) {}

    async canActivate(context: ExecutionContext): Promise<boolean> {
        const { user } = context.switchToHttp().getRequest();

        if (!user.isActive) {
            this.debuggerService.error(
                'UserGuard Inactive',
                'AuthDefaultGuard',
                'canActivate'
            );

            throw new ForbiddenException({
                statusCode:
                    ENUM_AUTH_STATUS_CODE_ERROR.AUTH_GUARD_INACTIVE_ERROR,
                message: 'auth.error.blocked',
            });
        } else if (!user.role.isActive) {
            this.debuggerService.error(
                'UserGuard Role Inactive',
                'AuthDefaultGuard',
                'canActivate'
            );

            throw new ForbiddenException({
                statusCode:
                    ENUM_AUTH_STATUS_CODE_ERROR.AUTH_GUARD_ROLE_INACTIVE_ERROR,
                message: 'auth.error.roleBlocked',
            });
        }

        return true;
    }
}
