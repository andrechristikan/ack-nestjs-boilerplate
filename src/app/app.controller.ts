import { Controller, Get } from '@nestjs/common';
import { AppService } from 'app/app.service';
import { HelperService } from 'helper/helper.service';
import { ResponseSuccess } from 'helper/helper.constant';

@Controller('/api/test')
export class AppController {
    constructor(
        private readonly appService: AppService,
        private readonly helperService: HelperService,
    ) {}

    @Get('/')
    getHello(): ResponseSuccess {
        const message: string = this.appService.getHello();
        return this.helperService.response(200, message);
    }
}
