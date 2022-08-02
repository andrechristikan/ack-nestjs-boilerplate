import { Controller, Get, VERSION_NEUTRAL } from '@nestjs/common';
import { AuthExcludeApiKey } from 'src/common/auth/auth.decorator';
import { RequestExcludeTimestamp } from 'src/common/request/request.decorator';
import { Response } from 'src/common/response/response.decorator';
import { IResponse } from 'src/common/response/response.interface';
import { MessageEnumService } from '../services/message.enum.service';

@Controller({
    version: VERSION_NEUTRAL,
    path: '/',
})
export class MessageEnumController {
    constructor(private readonly messageEnumService: MessageEnumService) {}

    @Response('message.languages')
    @AuthExcludeApiKey()
    @RequestExcludeTimestamp()
    @Get('/languages')
    async languages(): Promise<IResponse> {
        const languages: string[] =
            await this.messageEnumService.getLanguages();
        return {
            languages,
        };
    }
}
