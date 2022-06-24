import {
    CallHandler,
    ExecutionContext,
    ForbiddenException,
    Injectable,
    NestInterceptor,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Reflector } from '@nestjs/core';
import { Observable } from 'rxjs';
import { HelperDateService } from 'src/utils/helper/service/helper.date.service';
import { HelperNumberService } from 'src/utils/helper/service/helper.number.service';
import {
    ENUM_REQUEST_STATUS_CODE_ERROR,
    REQUEST_EXCLUDE_TIMESTAMP_META_KEY,
} from '../request.constant';
import { IRequestApp } from '../request.interface';

@Injectable()
export class RequestTimestampInterceptor
    implements NestInterceptor<Promise<any>>
{
    constructor(
        private readonly configService: ConfigService,
        private readonly reflector: Reflector,
        private readonly helperDateService: HelperDateService,
        private readonly helperNumberService: HelperNumberService
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
                REQUEST_EXCLUDE_TIMESTAMP_META_KEY,
                context.getHandler()
            );

            if (!excludeTimestamp && mode === 'secure') {
                const toleranceTimeInMs = this.configService.get<number>(
                    'middleware.timestamp.toleranceTimeInMs'
                );
                const check: boolean = this.helperDateService.checkTimestamp(
                    this.helperNumberService.create(reqTs)
                );
                if (!reqTs || !check) {
                    throw new ForbiddenException({
                        statusCode:
                            ENUM_REQUEST_STATUS_CODE_ERROR.REQUEST_TIMESTAMP_INVALID_ERROR,
                        message: 'middleware.error.timestampInvalid',
                    });
                }

                const timestamp = this.helperDateService.create({
                    date: this.helperNumberService.create(reqTs),
                });
                const toleranceMin =
                    this.helperDateService.backwardInMilliseconds(
                        toleranceTimeInMs
                    );
                const toleranceMax =
                    this.helperDateService.forwardInMilliseconds(
                        toleranceTimeInMs
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
