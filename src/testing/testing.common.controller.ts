import { Controller, Get, VERSION_NEUTRAL } from '@nestjs/common';
import { UserAgent } from 'src/utils/request/request.decorator';
import { Response } from 'src/utils/response/response.decorator';
import { IResponse } from 'src/utils/response/response.interface';
import { IResult } from 'ua-parser-js';

@Controller({
    version: VERSION_NEUTRAL,
})
export class TestingCommonController {
    @Response('test.hello')
    @Get('/hello')
    async hello(@UserAgent() userAgent: IResult): Promise<IResponse> {
        return userAgent;
    }
}
