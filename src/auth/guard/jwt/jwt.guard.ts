import { AuthGuard } from '@nestjs/passport';
import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ResponseService } from 'src/response/response.service';
import { Response } from 'src/response/response.decorator';
import { AppErrorStatusCode } from 'src/status-code/status-code.error.constant';
import { IResponseError } from 'src/response/response.interface';
import { Logger as LoggerService } from 'winston';
import { Logger } from 'src/logger/logger.decorator';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class JwtGuard extends AuthGuard('jwt') {
    constructor(
        @Response() private readonly responseService: ResponseService,
        @Logger() private readonly logger: LoggerService,
        private readonly configService: ConfigService
    ) {
        super();
    }

    handleRequest<TUser = any>(
        err: Record<string, any>,
        user: TUser,
        info: string
    ): TUser {
        if (err || !user) {
            if (this.configService.get('app.debug')) {
                this.logger.error('AuthJwtGuardError', {
                    class: 'JwtGuard',
                    function: 'handleRequest',
                    description: info,
                    error: { ...err }
                });
            }
            const response: IResponseError = this.responseService.error(
                AppErrorStatusCode.UNAUTHORIZED_ERROR
            );

            throw new UnauthorizedException(response);
        }
        return user;
    }
}
