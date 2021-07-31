import {
    Body,
    Controller,
    Get,
    HttpCode,
    HttpStatus,
    Post
} from '@nestjs/common';
import { Message } from 'src/message/message.decorator';
import { MessageService } from 'src/message/message.service';
import { IResponse } from 'src/response/response.interface';
import { Decryption, Encryption } from './encryption.decorator';

@Controller('/encryption')
export class EncryptionController {
    constructor(@Message() private readonly messageService: MessageService) {}

    @Get('/encrypt')
    @Encryption()
    async en(): Promise<IResponse> {
        return { message: this.messageService.get('encryption.en') };
    }

    @Post('/encrypt-data')
    @Encryption()
    @HttpCode(HttpStatus.OK)
    async enData(@Body() body: Record<string, any>): Promise<IResponse> {
        return body;
    }

    @Post('/decrypt-data')
    @Decryption()
    @HttpCode(HttpStatus.OK)
    async deData(@Body() body: Record<string, any>): Promise<IResponse> {
        return body;
    }
}
