import {
    CallHandler,
    ExecutionContext,
    ForbiddenException,
    Injectable,
    NestInterceptor,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Observable } from 'rxjs';
import { HelperDateService } from 'src/common/helper/services/helper.date.service';
import { HelperNumberService } from 'src/common/helper/services/helper.number.service';
import { ENUM_REQUEST_STATUS_CODE_ERROR } from 'src/common/request/constants/request.status-code.constant';
import { IRequestApp } from 'src/common/request/interfaces/request.interface';

@Injectable()
export class RequestTimestampInterceptor
    implements NestInterceptor<Promise<any>>
{
    private readonly maxRequestTimestampInMs: number;

    constructor(
        private readonly configService: ConfigService,
        private readonly helperDateService: HelperDateService,
        private readonly helperNumberService: HelperNumberService
    ) {
        this.maxRequestTimestampInMs = this.configService.get<number>(
            'request.timestamp.toleranceTimeInMs'
        );
    }

    async intercept(
        context: ExecutionContext,
        next: CallHandler
    ): Promise<Observable<Promise<any> | string>> {
        if (context.getType() === 'http') {
            const request: IRequestApp = context.switchToHttp().getRequest();
            const { headers } = request;
            const requestTimestamp: string = headers['x-timestamp'] as string;

            if (!requestTimestamp) {
                throw new ForbiddenException({
                    statusCode:
                        ENUM_REQUEST_STATUS_CODE_ERROR.REQUEST_TIMESTAMP_INVALID_ERROR,
                    message: 'auth.apiKey.error.timestampInvalid',
                });
            }

            const timestamp = this.helperNumberService.create(requestTimestamp);
            const checkTimestamp =
                this.helperDateService.checkTimestamp(timestamp);

            if (!timestamp || !checkTimestamp) {
                throw new ForbiddenException({
                    statusCode:
                        ENUM_REQUEST_STATUS_CODE_ERROR.REQUEST_TIMESTAMP_INVALID_ERROR,
                    message: 'request.error.timestampInvalid',
                });
            }

            const timestampDate = this.helperDateService.create({
                date: timestamp,
            });

            const toleranceMin = this.helperDateService.backwardInMilliseconds(
                this.maxRequestTimestampInMs
            );
            const toleranceMax = this.helperDateService.forwardInMilliseconds(
                this.maxRequestTimestampInMs
            );

            if (timestampDate < toleranceMin || timestampDate > toleranceMax) {
                throw new ForbiddenException({
                    statusCode:
                        ENUM_REQUEST_STATUS_CODE_ERROR.REQUEST_TIMESTAMP_INVALID_ERROR,
                    message: 'request.error.timestampInvalid',
                });
            }
        }

        return next.handle();
    }
}
