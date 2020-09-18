import { Controller, Get } from '@nestjs/common';
import { AppService } from 'app/app.service';
import { HelperService } from 'helper/helper.service';
import { IResponseSuccess } from 'helper/helper.interface';

@Controller('/api/test')
export class AppController {
    constructor(
        private readonly appService: AppService,
        private readonly helperService: HelperService,
    ) {}

    @Get('/')
    getHello(): IResponseSuccess {
        const message: string = this.appService.getHello();
        return this.helperService.response(200, message);
    }
}
