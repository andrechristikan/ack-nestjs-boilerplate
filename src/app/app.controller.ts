import { Controller, Get } from '@nestjs/common';
import { AppService } from 'app/app.service';
import { ApiResponseService } from 'helper/api-response/api-response.service';
import { IApiResponseSuccess } from 'helper/api-response/api-response.interface';
import { ApiResponse } from 'helper/api-response/api-response.decorator';

@Controller('/api/test')
export class AppController {
    constructor(
        @ApiResponse() private readonly responseService: ApiResponseService,
        private readonly appService: AppService,
    ) {}

    @Get('/')
    getHello(): IApiResponseSuccess {
        const message: string = this.appService.getHello();
        return this.responseService.response(200, message);
    }
}
