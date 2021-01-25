import {
    Injectable,
    CanActivate,
    ExecutionContext,
    UnauthorizedException
} from '@nestjs/common';
import {
    AUTH_BASIC_TOKEN_CLIENT_ID,
    AUTH_BASIC_TOKEN_CLIENT_SECRET
} from 'auth/auth.constant';
import { Request } from 'express';
import { HashService } from 'hash/hash.service';
import { Response } from 'response/response.decorator';
import { AppErrorStatusCode } from 'status-code/status-code.error.constant';
import { IResponseError } from 'response/response.interface';
import { ResponseService } from 'response/response.service';
import { Logger as LoggerService } from 'winston';
import { Logger } from 'logger/logger.decorator';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class BasicGuard implements CanActivate {
    constructor(
        @Response() private readonly responseService: ResponseService,
        private readonly hashService: HashService,
        @Logger() private readonly logger: LoggerService,
        private readonly configService: ConfigService
    ) {}

    async canActivate(context: ExecutionContext): Promise<boolean> {
        // Env Variable
        const authBasicTokenClientId: string =
            this.configService.get('app.auth.basicTokenClientId') ||
            AUTH_BASIC_TOKEN_CLIENT_ID;
        const authBasicTokenClientSecret: string =
            this.configService.get('app.auth.basicTokenClientSecret') ||
            AUTH_BASIC_TOKEN_CLIENT_SECRET;

        const request: Request = context.switchToHttp().getRequest();

        const authorization: string = request.headers.authorization;

        if (!authorization) {
            this.logger.error('AuthBasicGuardError');
            const response: IResponseError = this.responseService.error(
                AppErrorStatusCode.UNAUTHORIZED_ERROR
            );
            throw new UnauthorizedException(response);
        }

        const clientBasicToken: string = authorization.replace('Basic ', '');
        const ourBasicToken: string = await this.hashService.createBasicToken(
            authBasicTokenClientId,
            authBasicTokenClientSecret
        );

        return this.hashService.validateBasicToken(
            clientBasicToken,
            ourBasicToken
        );
    }
}
