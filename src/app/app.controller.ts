import { Controller, Get, HttpCode, HttpStatus } from '@nestjs/common';
import { AppService } from 'src/app/app.service';
import { ResponseService } from 'src/response/response.service';
import { Response, ResponseStatusCode } from 'src/response/response.decorator';
import { IResponse } from 'src/response/response.interface';
import { AuthBasicGuard } from 'src/auth/auth.decorator';
@Controller('/test')
export class AppController {
    constructor(
        @Response() private readonly responseService: ResponseService,
        private readonly appService: AppService
    ) {}

    @ResponseStatusCode()
    @Get('/hello')
    async testHello(): Promise<IResponse> {
        const message: string = await this.appService.getHello();
        return this.responseService.success(message);
    }

    // HTTP STATUS MANIPULATE TO 201
    @HttpCode(HttpStatus.CREATED)
    @AuthBasicGuard()
    @ResponseStatusCode()
    @Get('/hello-basic')
    async testHelloBasicToken(): Promise<IResponse> {
        const message: string = await this.appService.getHello();
        return this.responseService.success(message);
    }
}
