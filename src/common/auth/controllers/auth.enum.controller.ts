import { Controller, Get } from '@nestjs/common';
import { Response } from 'src/common/response/response.decorator';
import { IResponse } from 'src/common/response/response.interface';
import { AuthEnumService } from '../services/auth.enum.service';

@Controller({
    version: '1',
    path: '/auth',
})
export class AuthEnumController {
    constructor(private readonly authEnumService: AuthEnumService) {}

    @Response('auth.enum.accessFor')
    @Get('/access-for')
    async accessFor(): Promise<IResponse> {
        const accessFor: string[] = await this.authEnumService.getAccessFor();
        return {
            accessFor,
        };
    }
}
