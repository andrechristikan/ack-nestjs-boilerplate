import { Injectable, NestMiddleware } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Response, NextFunction } from 'express';
import { HelperDateService } from 'src/common/helper/services/helper.date.service';
import { IRequestApp } from 'src/common/request/interfaces/request.interface';
@Injectable()
export class TimezoneMiddleware implements NestMiddleware {
    constructor(
        private readonly helperDateService: HelperDateService,
        private readonly configService: ConfigService
    ) {}

    async use(
        req: IRequestApp,
        res: Response,
        next: NextFunction
    ): Promise<void> {
        const tz: string = this.configService.get<string>('app.timezone');
        const reqTz: string = req.headers['x-timezone'] as string;

        if (!reqTz || (reqTz && !this.helperDateService.checkTimezone(reqTz))) {
            req.headers['x-timezone'] = tz;
            req.timezone = tz;
        } else {
            req.timezone = reqTz;
        }

        next();
    }
}
