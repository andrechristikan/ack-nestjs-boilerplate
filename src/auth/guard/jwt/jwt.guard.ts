import { AuthGuard } from '@nestjs/passport';
import { Injectable, UnauthorizedException } from '@nestjs/common';
import { Logger as DebuggerService } from 'winston';
import { Debugger } from 'src/debugger/debugger.decorator';
import { Message } from 'src/message/message.decorator';
import { MessageService } from 'src/message/message.service';

@Injectable()
export class JwtGuard extends AuthGuard('jwt') {
    constructor(
        @Message() private readonly messageService: MessageService,
        @Debugger() private readonly debuggerService: DebuggerService
    ) {
        super();
    }

    handleRequest<TUser = any>(
        err: Record<string, any>,
        user: TUser,
        info: string
    ): TUser {
        if (err || !user) {
            this.debuggerService.error('AuthJwtGuardError', {
                class: 'JwtGuard',
                function: 'handleRequest',
                description: info,
                error: { ...err }
            });

            throw new UnauthorizedException(
                this.messageService.get('http.clientError.unauthorized')
            );
        }

        return user;
    }
}
