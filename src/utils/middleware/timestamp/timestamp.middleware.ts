import { ForbiddenException, Injectable, NestMiddleware } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Request, Response, NextFunction } from 'express';
import { HelperDateService } from 'src/utils/helper/service/helper.date.service';
import { ENUM_REQUEST_STATUS_CODE_ERROR } from 'src/utils/request/request.constant';

@Injectable()
export class TimestampMiddleware implements NestMiddleware {
    constructor(
        private readonly helperDateService: HelperDateService,
        private readonly configService: ConfigService
    ) {}

    use(req: Request, res: Response, next: NextFunction): void {
        const mode: string = this.configService.get<string>('app.mode');

        if (mode === 'secure') {
            const toleranceTimeInMinutes = this.configService.get<number>(
                'middleware.timestamp.toleranceTimeInMinutes'
            );
            const ts: string = req.headers['x-timestamp'] as string;
            const check: boolean = this.helperDateService.check(
                isNaN(parseInt(ts)) ? ts : parseInt(ts)
            );
            if (!ts || !check) {
                throw new ForbiddenException({
                    statusCode:
                        ENUM_REQUEST_STATUS_CODE_ERROR.REQUEST_TIMESTAMP_INVALID_ERROR,
                    message: 'middleware.error.timestampInvalid',
                });
            }

            const timestamp = this.helperDateService.create(
                isNaN(parseInt(ts)) ? ts : parseInt(ts)
            );
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
        }

        next();
    }
}
