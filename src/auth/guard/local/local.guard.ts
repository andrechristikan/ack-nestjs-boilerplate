import { AuthGuard } from '@nestjs/passport';
import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ResponseService } from 'response/response.service';
import { Response } from 'response/response.decorator';
import { IApiErrorResponse } from 'response/response.interface';
import { SystemErrorStatusCode } from 'response/response.constant';
import { Logger as LoggerService } from 'winston';
import { Logger } from 'middleware/logger/logger.decorator';

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
                description: info,
                ...err
            });
            const response: IApiErrorResponse = this.responseService.error(
                SystemErrorStatusCode.UNAUTHORIZED_ERROR
            );

            throw new UnauthorizedException(response);
        }
        return user;
    }
}
