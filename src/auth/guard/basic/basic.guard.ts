import {
    Injectable,
    CanActivate,
    ExecutionContext,
    UnauthorizedException
} from '@nestjs/common';
import {
    AUTH_BASIC_CLIENT_ID,
    AUTH_BASIC_CLIENT_SECRET
} from 'src/auth/auth.constant';
import { Request } from 'express';
import { HashService } from 'src/hash/hash.service';
import { Response } from 'src/response/response.decorator';
import { AppErrorStatusCode } from 'src/status-code/status-code.error.constant';
import { IResponseError } from 'src/response/response.interface';
import { ResponseService } from 'src/response/response.service';
import { Logger as LoggerService } from 'winston';
import { Logger } from 'src/logger/logger.decorator';
import { ConfigService } from '@nestjs/config';
import { Hash } from 'src/hash/hash.decorator';

@Injectable()
export class BasicGuard implements CanActivate {
    constructor(
        @Response() private readonly responseService: ResponseService,
        @Hash() private readonly hashService: HashService,
        @Logger() private readonly logger: LoggerService,
        private readonly configService: ConfigService
    ) {}

    async canActivate(context: ExecutionContext): Promise<boolean> {
        // Env Variable
        const basicClientId: string =
            this.configService.get('app.auth.basicClientId') ||
            AUTH_BASIC_CLIENT_ID;
        const basicClientSecret: string =
            this.configService.get('app.auth.basicClientSecret') ||
            AUTH_BASIC_CLIENT_SECRET;

        const request: Request = context.switchToHttp().getRequest();

        const authorization: string = request.headers.authorization;

        if (!authorization) {
            this.logger.error('AuthBasicGuardError', {
                class: 'BasicGuard',
                function: 'canActivate'
            });
            const response: IResponseError = this.responseService.error(
                AppErrorStatusCode.UNAUTHORIZED_ERROR
            );
            throw new UnauthorizedException(response);
        }

        const clientBasicToken: string = authorization.replace('Basic ', '');
        const ourBasicToken: string = await this.hashService.createBasicToken(
            basicClientId,
            basicClientSecret
        );

        const validateBasicToken: boolean = await this.hashService.validateBasicToken(
            clientBasicToken,
            ourBasicToken
        );

        if (!validateBasicToken) {
            this.logger.error('AuthBasicGuardError Validate Basic Token', {
                class: 'BasicGuard',
                function: 'canActivate'
            });
            const response: IResponseError = this.responseService.error(
                AppErrorStatusCode.UNAUTHORIZED_ERROR
            );
            throw new UnauthorizedException(response);
        }

        return true;
    }
}
