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
export class AuthPayloadPasswordExpiredGuard implements CanActivate {
    constructor(
        @Debugger() private readonly debuggerService: DebuggerService
    ) {}

    async canActivate(context: ExecutionContext): Promise<boolean> {
        const { user } = context.switchToHttp().getRequest();
        const { passwordExpiredDate } = user;
        const today: Date = new Date();
        const dPasswordExpiredDate = new Date(passwordExpiredDate);

        if (today > dPasswordExpiredDate) {
            this.debuggerService.error('Auth password expired', {
                class: 'AuthPasswordExpiredGuard',
                function: 'canActivate',
            });

            throw new ForbiddenException({
                statusCode:
                    ENUM_AUTH_STATUS_CODE_ERROR.AUTH_GUARD_PASSWORD_EXPIRED_ERROR,
                message: 'auth.error.passwordExpiredDate',
            });
        }

        return true;
    }
}
