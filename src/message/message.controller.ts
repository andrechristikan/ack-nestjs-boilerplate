import { Controller, Get, VERSION_NEUTRAL } from '@nestjs/common';
import { Response } from 'src/response/response.decorator';
import { IResponse } from 'src/response/response.interface';
import { MessageService } from './message.service';

@Controller({
    version: VERSION_NEUTRAL,
    path: 'message',
})
export class MessageEnumController {
    constructor(private readonly messageService: MessageService) {}

    @Response('message.enum.languages')
    @Get('/languages')
    async languages(): Promise<IResponse> {
        const languages: string[] = await this.messageService.getLanguages();
        return {
            languages,
        };
    }
}
