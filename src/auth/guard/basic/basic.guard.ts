import {
    Injectable,
    CanActivate,
    ExecutionContext,
    UnauthorizedException
} from '@nestjs/common';
import { Request } from 'express';
import { Response } from 'src/response/response.decorator';
import { IResponse } from 'src/response/response.interface';
import { ResponseService } from 'src/response/response.service';
import { Logger as LoggerService } from 'winston';
import { Logger } from 'src/logger/logger.decorator';
import { ConfigService } from '@nestjs/config';
import { Message } from 'src/message/message.decorator';
import { MessageService } from 'src/message/message.service';
import { AuthService } from 'src/auth/auth.service';

@Injectable()
export class BasicGuard implements CanActivate {
    constructor(
        @Response() private readonly responseService: ResponseService,
        @Logger() private readonly logger: LoggerService,
        @Message() private readonly messageService: MessageService,
        private readonly configService: ConfigService,
        private readonly authService: AuthService
    ) {}

    async canActivate(context: ExecutionContext): Promise<boolean> {
        const request: Request = context.switchToHttp().getRequest();

        const authorization: string = request.headers.authorization;

        if (!authorization) {
            this.logger.error('AuthBasicGuardError', {
                class: 'BasicGuard',
                function: 'canActivate'
            });

            throw new UnauthorizedException(
                this.messageService.get('http.clientError.unauthorized')
            );
        }

        const clientBasicToken: string = authorization.replace('Basic ', '');
        const ourBasicToken: string = await this.authService.createBasicToken(
            this.configService.get<string>('auth.basicTokenClientId'),
            this.configService.get<string>('auth.basicTokenClientSecret')
        );

        const validateBasicToken: boolean = await this.authService.validateBasicToken(
            clientBasicToken,
            ourBasicToken
        );

        if (!validateBasicToken) {
            this.logger.error('AuthBasicGuardError Validate Basic Token', {
                class: 'BasicGuard',
                function: 'canActivate'
            });

            throw new UnauthorizedException(
                this.messageService.get('http.clientError.unauthorized')
            );
        }

        return true;
    }
}
