import { Controller, Get, VERSION_NEUTRAL } from '@nestjs/common';
import { ApiKey } from 'src/auth/auth.decorator';
import { IAuthApiPayload } from 'src/auth/auth.interface';
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
    async hello(
        @UserAgent() userAgent: IResult,
        @ApiKey() apiKey: IAuthApiPayload
    ): Promise<IResponse> {
        return { userAgent, apiKey };
    }
}
