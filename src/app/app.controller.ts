import { Controller, Get, HttpCode, HttpStatus } from '@nestjs/common';

import { AuthBasicGuard } from 'src/auth/auth.decorator';
import { HttpResponse } from 'src/response/http/http-response.decorator';
@Controller('/test')
export class AppController {
    @Get('/hello')
    @HttpResponse('app.testHello')
    async testHello(): Promise<void> {
        return;
    }

    // HTTP STATUS MANIPULATE TO 201
    @Get('/hello-basic')
    @HttpCode(HttpStatus.CREATED)
    @AuthBasicGuard()
    @HttpResponse('app.testHelloBasicToken')
    async testHelloBasicToken(): Promise<void> {
        return;
    }
}
