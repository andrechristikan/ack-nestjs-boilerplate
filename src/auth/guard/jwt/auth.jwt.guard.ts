import { AuthGuard } from '@nestjs/passport';
import {
    ExecutionContext,
    Injectable,
    UnauthorizedException,
} from '@nestjs/common';
import { ENUM_AUTH_STATUS_CODE_ERROR } from 'src/auth/auth.constant';
import { DebuggerService } from 'src/debugger/service/debugger.service';
import { IRequestApp } from 'src/utils/request/request.interface';

@Injectable()
export class JwtGuard extends AuthGuard('jwt') {
    constructor(private readonly debuggerService: DebuggerService) {
        super();
    }

    handleRequest<TUser = any>(
        err: Record<string, any>,
        user: TUser,
        info: string,
        context: ExecutionContext
    ): TUser {
        if (err || !user) {
            const request: IRequestApp = context.switchToHttp().getRequest();

            this.debuggerService.error(
                request.id,
                {
                    description: info,
                    class: 'JwtGuard',
                    function: 'handleRequest',
                },
                err
            );

            throw new UnauthorizedException({
                statusCode:
                    ENUM_AUTH_STATUS_CODE_ERROR.AUTH_GUARD_JWT_ACCESS_TOKEN_ERROR,
                message: 'http.clientError.unauthorized',
            });
        }

        return user;
    }
}
