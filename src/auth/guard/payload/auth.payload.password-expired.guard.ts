import {
    Injectable,
    CanActivate,
    ExecutionContext,
    ForbiddenException,
} from '@nestjs/common';
import { ENUM_AUTH_STATUS_CODE_ERROR } from 'src/auth/auth.constant';
import { DebuggerService } from 'src/debugger/service/debugger.service';

@Injectable()
export class AuthPayloadPasswordExpiredGuard implements CanActivate {
    constructor(private readonly debuggerService: DebuggerService) {}

    async canActivate(context: ExecutionContext): Promise<boolean> {
        const { user } = context.switchToHttp().getRequest();
        const { passwordExpiredDate } = user;
        const today: Date = new Date();
        const dPasswordExpiredDate = new Date(passwordExpiredDate);

        if (today > dPasswordExpiredDate) {
            this.debuggerService.error(
                'Auth password expired',
                'AuthPasswordExpiredGuard',
                'canActivate'
            );

            throw new ForbiddenException({
                statusCode:
                    ENUM_AUTH_STATUS_CODE_ERROR.AUTH_GUARD_PASSWORD_EXPIRED_ERROR,
                message: 'auth.error.passwordExpiredDate',
            });
        }

        return true;
    }
}
