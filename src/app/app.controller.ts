import { Controller, Get } from '@nestjs/common';
import { AppService } from 'src/app/app.service';
import { ResponseService } from 'src/response/response.service';
import { Response } from 'src/response/response.decorator';
import { IResponse } from 'src/response/response.interface';
@Controller('/hello')
export class AppController {
    constructor(
        @Response() private readonly responseService: ResponseService,
        private readonly appService: AppService
    ) {}

    @Get('/')
    async getHello(): Promise<string> {
        const message: string = await this.appService.getHello();
        return 'asdasd';
        // return {
        //     email: 'andreck@gradana.com',
        //     password: '123123'
        // };
    }
}
