import { Controller, Get } from '@nestjs/common';
import { AuthExcludeApiKey } from 'src/common/auth/decorators/auth.api-key.decorator';
import { AuthEnumService } from 'src/common/auth/services/auth.enum.service';
import { RequestExcludeTimestamp } from 'src/common/request/decorators/request.decorator';
import { Response } from 'src/common/response/decorators/response.decorator';
import { IResponse } from 'src/common/response/interfaces/response.interface';

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
