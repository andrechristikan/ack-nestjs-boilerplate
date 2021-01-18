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
import { Helper } from 'helper/helper.decorator';
import { HelperService } from 'helper/helper.service';
import { SystemErrorStatusCode } from 'response/response.constant';
import { Response } from 'response/response.decorator';
import { IApiErrorResponse } from 'response/response.interface';
import { ResponseService } from 'response/response.service';
import { Logger as LoggerService } from 'winston';
import { Logger } from 'middleware/logger/logger.decorator';

@Injectable()
export class BasicGuard implements CanActivate {
    constructor(
        @Response() private readonly responseService: ResponseService,
        @Helper() private readonly helperService: HelperService,
        @Logger() private readonly logger: LoggerService
    ) {}

    async canActivate(context: ExecutionContext): Promise<boolean> {
        const request: Request = context.switchToHttp().getRequest();

        const authorization: string = request.headers.authorization;

        if (!authorization) {
            this.logger.error('AuthBasicGuardError');
            const response: IApiErrorResponse = this.responseService.error(
                SystemErrorStatusCode.UNAUTHORIZED_ERROR
            );
            throw new UnauthorizedException(response);
        }

        const clientBasicToken: string = authorization.replace('Basic ', '');
        const ourBasicToken: string = await this.helperService.createBasicToken(
            AUTH_BASIC_TOKEN_CLIENT_ID,
            AUTH_BASIC_TOKEN_CLIENT_SECRET
        );

        return this.helperService.validateBasicToken(
            clientBasicToken,
            ourBasicToken
        );
    }
}
