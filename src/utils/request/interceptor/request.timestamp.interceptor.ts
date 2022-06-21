import {
    CallHandler,
    ExecutionContext,
    ForbiddenException,
    NestInterceptor,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Reflector } from '@nestjs/core';
import { Observable } from 'rxjs';
import { HelperDateService } from 'src/utils/helper/service/helper.date.service';
import { ENUM_REQUEST_STATUS_CODE_ERROR } from '../request.constant';
import { IRequestApp } from '../request.interface';

export class RequestTimestampInterceptor
    implements NestInterceptor<Promise<any>>
{
    constructor(
        private readonly configService: ConfigService,
        private readonly reflector: Reflector,
        private readonly helperDateService: HelperDateService
    ) {}

    async intercept(
        context: ExecutionContext,
        next: CallHandler
    ): Promise<Observable<Promise<any> | string>> {
        if (context.getType() === 'http') {
            const request: IRequestApp = context.switchToHttp().getRequest();
            const { headers } = request;
            const mode: string = this.configService.get<string>('app.mode');
            const reqTs: string = headers['x-timestamp'] as string;
            const currentTimestamp: number = this.helperDateService.timestamp();
            const excludeTimestamp = this.reflector.get<boolean>(
                'excludeTimestamp',
                context.getHandler()
            );

            if (!excludeTimestamp && mode === 'secure') {
                const toleranceTimeInMinutes = this.configService.get<number>(
                    'middleware.timestamp.toleranceTimeInMinutes'
                );
                const check: boolean = this.helperDateService.check(
                    Number.isNaN(Number.parseInt(reqTs))
                        ? reqTs
                        : Number.parseInt(reqTs)
                );
                if (!reqTs || !check) {
                    throw new ForbiddenException({
                        statusCode:
                            ENUM_REQUEST_STATUS_CODE_ERROR.REQUEST_TIMESTAMP_INVALID_ERROR,
                        message: 'middleware.error.timestampInvalid',
                    });
                }

                const timestamp = this.helperDateService.create({
                    date: Number.isNaN(Number.parseInt(reqTs))
                        ? reqTs
                        : Number.parseInt(reqTs),
                });
                const toleranceMin = this.helperDateService.backwardInMinutes(
                    toleranceTimeInMinutes
                );
                const toleranceMax = this.helperDateService.forwardInMinutes(
                    toleranceTimeInMinutes
                );
                if (timestamp < toleranceMin || timestamp > toleranceMax) {
                    throw new ForbiddenException({
                        statusCode:
                            ENUM_REQUEST_STATUS_CODE_ERROR.REQUEST_TIMESTAMP_INVALID_ERROR,
                        message: 'middleware.error.timestampInvalid',
                    });
                }
            } else {
                const newTimestamp = reqTs || `${currentTimestamp}`;
                request.headers['x-timestamp'] = newTimestamp;
                request.timestamp = newTimestamp;
            }
        }

        return next.handle();
    }
}
