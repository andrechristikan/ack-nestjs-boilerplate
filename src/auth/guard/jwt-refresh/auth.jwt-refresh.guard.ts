import { AuthGuard } from '@nestjs/passport';
import { Injectable, UnauthorizedException } from '@nestjs/common';
import { Logger as DebuggerService } from 'winston';
import { Debugger } from 'src/debugger/debugger.decorator';
import { ENUM_AUTH_STATUS_CODE_ERROR } from 'src/auth/auth.constant';

@Injectable()
export class JwtRefreshGuard extends AuthGuard('jwtRefresh') {
    constructor(@Debugger() private readonly debuggerService: DebuggerService) {
        super();
    }

    handleRequest<TUser = any>(
        err: Record<string, any>,
        user: TUser,
        info: string
    ): TUser {
        if (err || !user) {
            this.debuggerService.error('AuthJwtGuardError', {
                class: 'JwtRefreshGuard',
                function: 'handleRequest',
                description: info,
                error: { ...err }
            });

            throw new UnauthorizedException({
                statusCode:
                    ENUM_AUTH_STATUS_CODE_ERROR.AUTH_GUARD_JWT_REFRESH_TOKEN_ERROR,
                message: 'http.clientError.unauthorized'
            });
        }

        return user;
    }
}
