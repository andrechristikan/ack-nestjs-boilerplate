import { Controller, Get } from '@nestjs/common';
import { ErrorMeta } from 'src/utils/error/error.decorator';
import { Response } from 'src/utils/response/response.decorator';
import { IResponse } from 'src/utils/response/response.interface';
import { MessageService } from '../service/message.service';

@Controller({
    version: '1',
    path: 'message',
})
export class MessageEnumController {
    constructor(private readonly messageService: MessageService) {}

    @Response('message.enum.languages')
    @ErrorMeta(MessageEnumController.name, 'languages')
    @Get('/languages')
    async languages(): Promise<IResponse> {
        const languages: string[] = await this.messageService.getLanguages();
        return {
            languages,
        };
    }
}
