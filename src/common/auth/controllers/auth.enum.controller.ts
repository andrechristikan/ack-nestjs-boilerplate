import { Controller, Get } from '@nestjs/common';
import { RequestExcludeTimestamp } from 'src/common/request/decorators/request.decorator';
import { Response } from 'src/common/response/decorators/response.decorator';
import { IResponse } from 'src/common/response/response.interface';
import { AuthExcludeApiKey } from '../decorators/auth.api-key.decorator';
import { AuthEnumService } from '../services/auth.enum.service';

@Controller({
    version: '1',
    path: '/auth',
})
export class AuthEnumController {
    constructor(private readonly authEnumService: AuthEnumService) {}

    @Response('auth.enum.accessFor')
    @AuthExcludeApiKey()
    @RequestExcludeTimestamp()
    @Get('/access-for')
    async accessFor(): Promise<IResponse> {
        const accessFor: string[] = await this.authEnumService.getAccessFor();
        return {
            accessFor,
        };
    }
}
