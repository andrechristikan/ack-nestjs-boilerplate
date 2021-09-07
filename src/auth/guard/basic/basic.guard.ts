import {
    Injectable,
    CanActivate,
    ExecutionContext,
    UnauthorizedException
} from '@nestjs/common';
import { Request } from 'express';
import { Logger as DebuggerService } from 'winston';
import { Debugger } from 'src/debugger/debugger.decorator';
import { ConfigService } from '@nestjs/config';
import { AuthService } from 'src/auth/auth.service';
import { Message } from 'src/message/message.decorator';
import { MessageService } from 'src/message/message.service';

@Injectable()
export class BasicGuard implements CanActivate {
    constructor(
        @Message() private readonly messageService: MessageService,
        @Debugger() private readonly debuggerService: DebuggerService,
        private readonly configService: ConfigService,
        private readonly authService: AuthService
    ) {}

    async canActivate(context: ExecutionContext): Promise<boolean> {
        const request: Request = context.switchToHttp().getRequest();

        const authorization: string = request.headers.authorization;

        if (!authorization) {
            this.debuggerService.error('AuthBasicGuardError', {
                class: 'BasicGuard',
                function: 'canActivate'
            });

            throw new UnauthorizedException(
                this.messageService.get('http.clientError.unauthorized')
            );
        }

        const clientBasicToken: string = authorization.replace('Basic ', '');
        const ourBasicToken: string = await this.authService.createBasicToken(
            this.configService.get<string>('auth.basicToken.clientId'),
            this.configService.get<string>('auth.basicToken.clientSecret')
        );

        const validateBasicToken: boolean = await this.authService.validateBasicToken(
            clientBasicToken,
            ourBasicToken
        );

        if (!validateBasicToken) {
            this.debuggerService.error(
                'AuthBasicGuardError Validate Basic Token',
                {
                    class: 'BasicGuard',
                    function: 'canActivate'
                }
            );

            throw new UnauthorizedException(
                this.messageService.get('http.clientError.unauthorized')
            );
        }

        return true;
    }
}
