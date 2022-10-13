import {
    Controller,
    Get,
    InternalServerErrorException,
    VERSION_NEUTRAL,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ApiTags } from '@nestjs/swagger';
import { AppHelloSerialization } from 'src/app/serializations/app.hello.serialization';
import { ErrorMeta } from 'src/common/error/decorators/error.decorator';
import { HelperDateService } from 'src/common/helper/services/helper.date.service';
import { HelperService } from 'src/common/helper/services/helper.service';
import { ENUM_LOGGER_ACTION } from 'src/common/logger/constants/logger.enum.constant';
import { Logger } from 'src/common/logger/decorators/logger.decorator';
import { RequestUserAgent } from 'src/common/request/decorators/request.decorator';
import {
    Response,
    ResponseTimeout,
} from 'src/common/response/decorators/response.decorator';
import { IResponse } from 'src/common/response/interfaces/response.interface';
import { IResult } from 'ua-parser-js';

@ApiTags('hello')
@Controller({
    version: VERSION_NEUTRAL,
    path: '/',
})
export class AppController {
    constructor(
        private readonly configService: ConfigService,
        private readonly helperDateService: HelperDateService,
        private readonly helperService: HelperService
    ) {}

    @Response('app.hello', { classSerialization: AppHelloSerialization })
    @Logger(ENUM_LOGGER_ACTION.TEST, { tags: ['test'] })
    @Get('/hello')
    async hello(@RequestUserAgent() userAgent: IResult): Promise<IResponse> {
        const serviceName = this.configService.get<string>('app.name');
        const newDate = this.helperDateService.create();

        return {
            metadata: {
                properties: {
                    serviceName,
                },
            },
            userAgent,
            date: newDate,
            format: this.helperDateService.format(newDate),
            timestamp: this.helperDateService.timestamp({
                date: newDate,
            }),
        };
    }

    @Response('app.helloTimeout')
    @ResponseTimeout('10s')
    @ErrorMeta(AppController.name, 'helloTimeoutCustom')
    @Get('/hello/timeout')
    async helloTimeout(): Promise<IResponse> {
        const serviceName = this.configService.get<string>('app.name');

        await this.helperService.delay(60000);

        return {
            metadata: {
                properties: {
                    serviceName,
                },
            },
        };
    }
}
