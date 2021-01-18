import { Controller, Get } from '@nestjs/common';
import { AppService } from 'app/app.service';
import { ResponseService } from 'response/response.service';
import { IApiSuccessResponse } from 'response/response.interface';
import { Response } from 'response/response.decorator';
import { SystemSuccessStatusCode } from 'response/response.constant';

@Controller('/api/test')
export class AppController {
    constructor(
        @Response() private readonly responseService: ResponseService,
        private readonly appService: AppService
    ) {}

    @Get('/')
    async getHello(): Promise<IApiSuccessResponse> {
        const message: string = await this.appService.getHello();
        return this.responseService.success(SystemSuccessStatusCode.OK, {
            message
        });
    }
}
