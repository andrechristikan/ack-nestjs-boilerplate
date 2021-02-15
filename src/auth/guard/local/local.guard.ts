import { AuthGuard } from '@nestjs/passport';
import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ResponseService } from 'response/response.service';
import { Response } from 'response/response.decorator';
import { AppErrorStatusCode } from 'status-code/status-code.error.constant';
import { IResponseError } from 'response/response.interface';
import { Logger as LoggerService } from 'winston';
import { Logger } from 'logger/logger.decorator';

@Injectable()
export class LocalGuard extends AuthGuard('local') {
    constructor(
        @Response() private readonly responseService: ResponseService,
        @Logger() private readonly logger: LoggerService
    ) {
        super();
    }

    handleRequest<TUser = any>(
        err: Record<string, any>,
        user: TUser,
        info: string
    ): TUser {
        if (err || !user) {
            this.logger.error('AuthLocalGuardError', {
                class: 'LocalGuard',
                function: 'handleRequest',
                description: info,
                error: { ...err }
            });

            const response: IResponseError = this.responseService.error(
                AppErrorStatusCode.UNAUTHORIZED_ERROR
            );

            throw new UnauthorizedException(response);
        }
        return user;
    }
}
