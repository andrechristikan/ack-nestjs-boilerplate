import { Injectable, NestMiddleware } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Response, NextFunction } from 'express';
import { CacheService } from 'src/cache/service/cache.service';
import { HelperDateService } from 'src/utils/helper/service/helper.date.service';

@Injectable()
export class TimezoneMiddleware implements NestMiddleware {
    constructor(
        private readonly helperDateService: HelperDateService,
        private readonly configService: ConfigService,
        private readonly cacheService: CacheService
    ) {}

    async use(req: any, res: Response, next: NextFunction): Promise<void> {
        const tz: string = this.configService.get<string>('app.timezone');
        const reqTz: string = req.headers['x-timezone'] as string;

        if (!reqTz || (reqTz && !this.helperDateService.checkTimezone(reqTz))) {
            req.headers['x-timezone'] = tz;
            await this.cacheService.set(`x-timezone`, tz);
        } else {
            await this.cacheService.set(`x-timezone`, reqTz);
        }

        next();
    }
}
