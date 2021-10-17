import { Controller, Get, HttpCode, HttpStatus } from '@nestjs/common';

import { AuthBasicGuard } from 'src/auth/auth.decorator';
import { Message } from 'src/message/message.decorator';
import { MessageService } from 'src/message/message.service';
import { ENUM_RESPONSE_STATUS_CODE } from 'src/response/response.constant';
import { Response } from 'src/response/response.decorator';
import { CustomHttpException } from 'src/response/response.filter';
@Controller('/test')
export class AppController {
    constructor(@Message() private readonly messageService: MessageService) {}

    @Get('/hello')
    @Response('app.testHello')
    async testHello(): Promise<void> {
        return;
    }

    @Get('/error')
    @Response('app.testHello')
    async testError(): Promise<void> {
        throw new CustomHttpException(ENUM_RESPONSE_STATUS_CODE.TEST_ERROR);
    }

    @Get('/error-rewrite')
    @Response('app.testHello')
    async testErrorRewrite(): Promise<void> {
        throw new CustomHttpException(ENUM_RESPONSE_STATUS_CODE.TEST_ERROR, {
            message: this.messageService.get('app.testErrorRewrite')
        });
    }

    @Get('/error-data')
    @Response('app.testHello')
    async testErrorData(): Promise<void> {
        throw new CustomHttpException(ENUM_RESPONSE_STATUS_CODE.TEST_ERROR, {
            message: this.messageService.get('app.testErrorData'),
            errors: [
                {
                    message: this.messageService.get('app.testErrors'),
                    property: 'test'
                }
            ]
        });
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
