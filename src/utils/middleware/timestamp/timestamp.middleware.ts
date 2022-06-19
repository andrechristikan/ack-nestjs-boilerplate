import { ForbiddenException, Injectable, NestMiddleware } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Request, Response, NextFunction } from 'express';
import { CacheService } from 'src/cache/service/cache.service';
import { HelperDateService } from 'src/utils/helper/service/helper.date.service';
import { ENUM_REQUEST_STATUS_CODE_ERROR } from 'src/utils/request/request.constant';

@Injectable()
export class TimestampMiddleware implements NestMiddleware {
    constructor(
        private readonly helperDateService: HelperDateService,
        private readonly configService: ConfigService,
        private readonly cacheService: CacheService
    ) {}

    async use(req: Request, res: Response, next: NextFunction): Promise<void> {
        const mode: string = this.configService.get<string>('app.mode');
        const reqTz: string = req.headers['x-timezone'] as string;
        const currentTimestamp: number = this.helperDateService.timestamp({
            timezone: reqTz,
        });

        if (mode === 'secure') {
            const toleranceTimeInMinutes = this.configService.get<number>(
                'middleware.timestamp.toleranceTimeInMinutes'
            );
            const ts: string = req.headers['x-timestamp'] as string;
            const check: boolean = this.helperDateService.check(
                Number.isNaN(Number.parseInt(ts)) ? ts : Number.parseInt(ts),
                { timezone: reqTz }
            );
            if (!ts || !check) {
                throw new ForbiddenException({
                    statusCode:
                        ENUM_REQUEST_STATUS_CODE_ERROR.REQUEST_TIMESTAMP_INVALID_ERROR,
                    message: 'middleware.error.timestampInvalid',
                });
            }

            const timestamp = this.helperDateService.create({
                date: Number.isNaN(Number.parseInt(ts))
                    ? ts
                    : Number.parseInt(ts),
                timezone: reqTz,
            });
            const toleranceMin = this.helperDateService.backwardInMinutes(
                toleranceTimeInMinutes,
                { timezone: reqTz }
            );
            const toleranceMax = this.helperDateService.forwardInMinutes(
                toleranceTimeInMinutes,
                { timezone: reqTz }
            );
            if (timestamp < toleranceMin || timestamp > toleranceMax) {
                throw new ForbiddenException({
                    statusCode:
                        ENUM_REQUEST_STATUS_CODE_ERROR.REQUEST_TIMESTAMP_INVALID_ERROR,
                    message: 'middleware.error.timestampInvalid',
                });
            }

            await this.cacheService.set(`x-timestamp`, timestamp);
        } else {
            await this.cacheService.set(`x-timestamp`, currentTimestamp);
        }

        next();
    }
}
