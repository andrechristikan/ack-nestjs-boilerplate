import { Injectable, NestMiddleware } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Request, Response, NextFunction } from 'express';
import { CacheService } from 'src/cache/service/cache.service';
import { HelperDateService } from 'src/utils/helper/service/helper.date.service';

@Injectable()
export class TimestampMiddleware implements NestMiddleware {
    constructor(
        private readonly helperDateService: HelperDateService,
        private readonly configService: ConfigService,
        private readonly cacheService: CacheService
    ) {}

    async use(req: Request, res: Response, next: NextFunction): Promise<void> {
        const mode: string = this.configService.get<string>('app.mode');
        const tz: string = this.configService.get<string>('app.timezone');
        let reqTs: string = req.headers['x-timestamp'] as string;
        let reqTz: string = req.headers['x-timezone'] as string;

        if (!reqTz || (reqTz && !this.helperDateService.checkTimezone(reqTz))) {
            reqTz = tz;
        }

        const currentTimestamp: number = this.helperDateService.timestamp({
            timezone: reqTz,
        });

        if (mode !== 'secure' && !reqTs) {
            reqTs = `${currentTimestamp}`;
        }

        req.headers['x-timestamp'] = reqTs;
        await this.cacheService.set(`x-timestamp`, reqTs);

        next();
    }
}
