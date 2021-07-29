import {
    BadRequestException,
    Controller,
    Get,
    HttpCode,
    HttpStatus
} from '@nestjs/common';

import { ResponseService } from 'src/response/response.service';
import { Response, ResponseJson } from 'src/response/response.decorator';
import { IResponse } from 'src/response/response.interface';
import { AuthBasicGuard } from 'src/auth/auth.decorator';
import { MessageService } from 'src/message/message.service';
import { Message } from 'src/message/message.decorator';
@Controller('/test')
export class AppController {
    constructor(
        @Message() private readonly messageService: MessageService,
        @Response() private readonly responseService: ResponseService
    ) {}

    @ResponseJson()
    @Get('/hello')
    async testHello(): Promise<IResponse> {
        const message: string = this.messageService.get('app.testHello');
        return this.responseService.success(message);
    }

    // HTTP STATUS MANIPULATE TO 201
    @HttpCode(HttpStatus.CREATED)
    @AuthBasicGuard()
    @ResponseJson()
    @Get('/hello-basic')
    async testHelloBasicToken(): Promise<IResponse> {
        const message: string = this.messageService.get(
            'app.testHelloBasicToken'
        );
        return this.responseService.success(message);
    }
}
