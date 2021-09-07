import { Controller, Get, HttpCode, HttpStatus } from '@nestjs/common';

import { Response } from 'src/response/response.decorator';
import { AuthBasicGuard, AuthJwtGuard } from 'src/auth/auth.decorator';
@Controller('/test')
export class AppController {
    @Get('/hello')
    @AuthJwtGuard()
    @Response('app.testHello')
    async testHello(): Promise<void> {
        return;
    }

    // HTTP STATUS MANIPULATE TO 201
    @Get('/hello-basic')
    @HttpCode(HttpStatus.CREATED)
    @AuthBasicGuard()
    @Response('app.testHelloBasicToken')
    async testHelloBasicToken(): Promise<void> {
        return;
    }
}
