import { Injectable, CanActivate, ExecutionContext } from '@nestjs/common';
import { Request } from 'express';
import { Logger as DebuggerService } from 'winston';
import { Debugger } from 'src/debugger/debugger.decorator';
import { ConfigService } from '@nestjs/config';
import { AuthService } from 'src/auth/auth.service';
import { Message } from 'src/message/message.decorator';
import { MessageService } from 'src/message/message.service';
import { CustomHttpException } from 'src/response/response.filter';
import { ENUM_RESPONSE_STATUS_CODE } from 'src/response/response.constant';

@Injectable()
export class BasicGuard implements CanActivate {
    private readonly clientId: string;
    private readonly clientSecret: string;

    constructor(
        @Message() private readonly messageService: MessageService,
        @Debugger() private readonly debuggerService: DebuggerService,
        private readonly configService: ConfigService,
        private readonly authService: AuthService
    ) {
        this.clientId = this.configService.get<string>(
            'auth.basicToken.clientId'
        );
        this.clientSecret = this.configService.get<string>(
            'auth.basicToken.clientSecret'
        );
    }

    async canActivate(context: ExecutionContext): Promise<boolean> {
        const request: Request = context.switchToHttp().getRequest();

        const authorization: string = request.headers.authorization;

        if (!authorization) {
            this.debuggerService.error('AuthBasicGuardError', {
                class: 'BasicGuard',
                function: 'canActivate'
            });

            throw new CustomHttpException(
                ENUM_RESPONSE_STATUS_CODE.AUTH_GUARD_BASIC_TOKEN_NEEDED_ERROR
            );
        }

        const clientBasicToken: string = authorization.replace('Basic ', '');
        const ourBasicToken: string = await this.authService.createBasicToken(
            this.clientId,
            this.clientSecret
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

            throw new CustomHttpException(
                ENUM_RESPONSE_STATUS_CODE.AUTH_GUARD_BASIC_TOKEN_INVALID_ERROR
            );
        }

        return true;
    }
}
