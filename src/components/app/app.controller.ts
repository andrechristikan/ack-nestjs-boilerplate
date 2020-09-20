import { Controller, Get } from '@nestjs/common';
import { AppService } from 'components/app/app.service';
import { ResponseService } from 'common/response/response.service';
import { IResponseSuccess } from 'common/response/response.interface';

@Controller('/api/test')
export class AppController {
    constructor(
        private readonly appService: AppService,
        private readonly responseService: ResponseService,
    ) {}

    @Get('/')
    getHello(): IResponseSuccess {
        const message: string = this.appService.getHello();
        return this.responseService.response(200, message);
    }
}
