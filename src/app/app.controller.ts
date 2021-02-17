import { Controller, Get } from '@nestjs/common';
import { AppService } from 'src/app/app.service';
import { ResponseService } from 'src/response/response.service';
import { AppSuccessStatusCode } from 'src/status-code/status-code.success.constant';
import { Response } from 'src/response/response.decorator';
import { IResponseSuccess } from 'src/response/response.interface';

@Controller('/api/test')
export class AppController {
    constructor(
        @Response() private readonly responseService: ResponseService,
        private readonly appService: AppService
    ) {}

    @Get('/')
    async getHello(): Promise<IResponseSuccess> {
        const message: string = await this.appService.getHello();
        return this.responseService.success(AppSuccessStatusCode.OK, {
            message
        });
    }
}
