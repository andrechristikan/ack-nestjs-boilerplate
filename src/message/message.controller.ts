import { Controller, Get } from '@nestjs/common';
import { Response } from 'src/response/response.decorator';
import { IResponse } from 'src/response/response.interface';
import { MessageService } from './message.service';

@Controller('/message')
export class MessageController {
    constructor(private readonly messageService: MessageService) {}

    @Response('message.enum.languages')
    @Get('/enum/languages')
    async languages(): Promise<IResponse> {
        const languages: string[] = await this.messageService.getLanguages();
        return {
            languages
        };
    }
}
