import {
    Body,
    Controller,
    Get,
    HttpCode,
    HttpStatus,
    Post
} from '@nestjs/common';
import { ResponseService } from 'src/response/response.service';
import { Response, ResponseStatusCode } from 'src/response/response.decorator';
import { Message } from 'src/message/message.decorator';
import { MessageService } from 'src/message/message.service';
import { Encryption } from './encryption.decorator';
import { IResponse } from 'src/response/response.interface';

@Controller('/encryption')
export class EncryptionController {
    constructor(
        @Response() private readonly responseService: ResponseService,
        @Message() private readonly messageService: MessageService
    ) {}

    @Get('/')
    @ResponseStatusCode()
    @Encryption()
    async get(): Promise<IResponse> {
        return this.responseService.success(
            this.messageService.get('encryption.get.success')
        );
    }

    @Post('/')
    @HttpCode(HttpStatus.OK)
    @ResponseStatusCode()
    @Encryption()
    async post(@Body() body: Record<string, any>): Promise<IResponse> {
        return this.responseService.success(
            this.messageService.get('encryption.get.success'),
            body
        );
    }
}
