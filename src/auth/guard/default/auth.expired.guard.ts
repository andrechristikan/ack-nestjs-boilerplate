import {
    Injectable,
    CanActivate,
    ExecutionContext,
    UnauthorizedException
} from '@nestjs/common';
import { Debugger } from 'src/debugger/debugger.decorator';
import { Logger as DebuggerService } from 'winston';
import { ENUM_AUTH_STATUS_CODE_ERROR } from 'src/auth/auth.constant';

@Injectable()
export class AuthExpiredGuard implements CanActivate {
    constructor(
        @Debugger() private readonly debuggerService: DebuggerService
    ) {}

    async canActivate(context: ExecutionContext): Promise<boolean> {
        const { user } = context.switchToHttp().getRequest();
        const { rememberMeExpired } = user;
        const today: Date = new Date();
        const rememberMeExpiredDate = new Date(rememberMeExpired);

        if (today > rememberMeExpiredDate) {
            this.debuggerService.error('Auth expired', {
                class: 'AuthExpiredGuard',
                function: 'canActivate'
            });

            throw new UnauthorizedException({
                statusCode: ENUM_AUTH_STATUS_CODE_ERROR.AUTH_EXPIRED_ERROR,
                message: 'auth.error.expired'
            });
        }

        return true;
    }
}
