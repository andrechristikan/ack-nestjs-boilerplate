import { Controller, Get, HttpStatus } from '@nestjs/common';

import { AuthBasicGuard, AuthJwtGuard, User } from 'src/auth/auth.decorator';
import { ENUM_ERROR_STATUS_CODE } from 'src/error/error.constant';
import { ErrorHttpException } from 'src/error/filter/error.http.filter';
import { Message } from 'src/message/message.decorator';
import { MessageService } from 'src/message/message.service';
import { Response } from 'src/response/response.decorator';
import { IResponse } from 'src/response/response.interface';
import { UserLoginTransformer } from 'src/user/transformer/user.login.transformer';
@Controller('/test')
export class AppController {
    constructor(@Message() private readonly messageService: MessageService) {}

    @Get('/hello')
    @Response('app.testHello')
    async testHello(): Promise<void> {
        return;
    }

    @AuthJwtGuard()
    @Get('/auth')
    @Response('app.auth')
    async auth(@User() user: UserLoginTransformer): Promise<IResponse> {
        return user;
    }

    @Get('/error')
    @Response('app.testHello')
    async testError(): Promise<void> {
        throw new ErrorHttpException(ENUM_ERROR_STATUS_CODE.TEST_ERROR);
    }

    @Get('/error-rewrite')
    @Response('app.testHello')
    async testErrorRewrite(): Promise<void> {
        throw new ErrorHttpException(ENUM_ERROR_STATUS_CODE.TEST_ERROR, {
            message: this.messageService.get('app.testErrorRewrite')
        });
    }

    @Get('/error-data')
    @Response('app.testHello')
    async testErrorData(): Promise<void> {
        throw new ErrorHttpException(ENUM_ERROR_STATUS_CODE.TEST_ERROR, {
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
    @AuthBasicGuard()
    @Response('app.testHelloBasicToken', HttpStatus.CREATED)
    async testHelloBasicToken(): Promise<void> {
        return;
    }
}
