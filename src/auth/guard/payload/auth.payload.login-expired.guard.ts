import {
    Injectable,
    CanActivate,
    ExecutionContext,
    ForbiddenException,
} from '@nestjs/common';
import { Debugger } from 'src/debugger/debugger.decorator';
import { Logger as DebuggerService } from 'winston';
import { ENUM_AUTH_STATUS_CODE_ERROR } from 'src/auth/auth.constant';

@Injectable()
export class AuthPayloadLoginExpiredGuard implements CanActivate {
    constructor(
        @Debugger() private readonly debuggerService: DebuggerService
    ) {}

    async canActivate(context: ExecutionContext): Promise<boolean> {
        const { user } = context.switchToHttp().getRequest();
        const { loginExpired } = user;
        const today: Date = new Date();
        const loginExpiredDate = new Date(loginExpired);

        if (today > loginExpiredDate) {
            this.debuggerService.error('Auth login expired', {
                class: 'AuthLoginExpiredGuard',
                function: 'canActivate',
            });

            throw new ForbiddenException({
                statusCode:
                    ENUM_AUTH_STATUS_CODE_ERROR.AUTH_GUARD_LOGIN_EXPIRED_ERROR,
                message: 'auth.error.loginExpired',
            });
        }

        return true;
    }
}
