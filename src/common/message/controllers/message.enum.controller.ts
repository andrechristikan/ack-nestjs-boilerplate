import { Controller, Get, VERSION_NEUTRAL } from '@nestjs/common';
import { AuthExcludeApiKey } from 'src/common/auth/decorators/auth.api-key.decorator';
import { MessageEnumService } from 'src/common/message/services/message.enum.service';
import { RequestExcludeTimestamp } from 'src/common/request/decorators/request.decorator';
import { Response } from 'src/common/response/decorators/response.decorator';
import { IResponse } from 'src/common/response/interfaces/response.interface';

@Controller({
    version: VERSION_NEUTRAL,
    path: '/message',
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
