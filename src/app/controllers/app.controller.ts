import {
    BadRequestException,
    Controller,
    Get,
    VERSION_NEUTRAL,
} from '@nestjs/common';
import { BadRequestError } from 'passport-headerapikey';
import { AuthExcludeApiKey } from 'src/common/auth/auth.decorator';
import { ErrorMeta } from 'src/common/error/error.decorator';
import { HelperDateService } from 'src/common/helper/services/helper.date.service';
import { HelperService } from 'src/common/helper/services/helper.service';
import { ENUM_LOGGER_ACTION } from 'src/common/logger/constants/logger.constant';
import { Logger } from 'src/common/logger/logger.decorator';
import {
    RequestTimezone,
    RequestUserAgent,
} from 'src/common/request/request.decorator';
import {
    Response,
    ResponseTimeout,
} from 'src/common/response/response.decorator';
import { IResponse } from 'src/common/response/response.interface';
import { IResult } from 'ua-parser-js';

@Controller({
    version: VERSION_NEUTRAL,
    path: '/',
})
export class AppController {
    constructor(
        private readonly helperDateService: HelperDateService,
        private readonly helperService: HelperService
    ) {}

    @Response('app.hello')
    @AuthExcludeApiKey()
    @Logger(ENUM_LOGGER_ACTION.TEST, { tags: ['test'] })
    @Get('/hello')
    async hello(
        @RequestUserAgent() userAgent: IResult,
        @RequestTimezone() timezone: string
    ): Promise<IResponse> {
        const newDate = this.helperDateService.create({
            timezone: timezone,
        });

        return {
            userAgent,
            date: newDate,
            format: this.helperDateService.format(newDate, {
                timezone: timezone,
            }),
            timestamp: this.helperDateService.timestamp({
                date: newDate,
                timezone: timezone,
            }),
        };
    }

    @Response('app.helloTimeout')
    @AuthExcludeApiKey()
    @ResponseTimeout('10s')
    @ErrorMeta(AppController.name, 'helloTimeoutCustom')
    @Get('/hello/timeout')
    async helloTimeout(): Promise<IResponse> {
        await this.helperService.delay(60000);

        return;
    }
}
