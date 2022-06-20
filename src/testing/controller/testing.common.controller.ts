import { Controller, Get, VERSION_NEUTRAL } from '@nestjs/common';
import { AuthExcludeApiKey } from 'src/auth/auth.decorator';
import { CacheService } from 'src/cache/service/cache.service';
import { HelperDateService } from 'src/utils/helper/service/helper.date.service';
import { HelperService } from 'src/utils/helper/service/helper.service';
import { UserAgent } from 'src/utils/request/request.decorator';
import {
    Response,
    ResponseTimeout,
} from 'src/utils/response/response.decorator';
import { IResponse } from 'src/utils/response/response.interface';
import { IResult } from 'ua-parser-js';

@Controller({
    version: VERSION_NEUTRAL,
})
export class TestingCommonController {
    constructor(
        private readonly cacheService: CacheService,
        private readonly helperDateService: HelperDateService,
        private readonly helperService: HelperService
    ) {}

    @Response('test.hello')
    @AuthExcludeApiKey()
    @Get('/hello')
    async hello(@UserAgent() userAgent: IResult): Promise<IResponse> {
        const newDate = this.helperDateService.create({
            timezone: await this.cacheService.getTimezone(),
        });
        return {
            userAgent,
            date: newDate,
            format: this.helperDateService.format(newDate, {
                timezone: await this.cacheService.getTimezone(),
            }),
            timestamp: this.helperDateService.timestamp({
                date: newDate,
                timezone: await this.cacheService.getTimezone(),
            }),
        };
    }

    @Response('test.helloTimeout')
    @AuthExcludeApiKey()
    @ResponseTimeout(10)
    @Get('/hello-timeout')
    async helloTimeout(@UserAgent() userAgent: IResult): Promise<IResponse> {
        await this.helperService.delay(60000);

        const newDate = this.helperDateService.create({
            timezone: await this.cacheService.getTimezone(),
        });
        return {
            userAgent,
            date: newDate,
            format: this.helperDateService.format(newDate, {
                timezone: await this.cacheService.getTimezone(),
            }),
            timestamp: this.helperDateService.timestamp({
                date: newDate,
                timezone: await this.cacheService.getTimezone(),
            }),
        };
    }
}
