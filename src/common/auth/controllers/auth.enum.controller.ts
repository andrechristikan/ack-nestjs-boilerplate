import { Controller, Get } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { AuthAccessForSerialization } from 'src/common/auth/serializations/auth.access-for.serialization';
import { AuthEnumService } from 'src/common/auth/services/auth.enum.service';
import { Response } from 'src/common/response/decorators/response.decorator';
import { IResponse } from 'src/common/response/interfaces/response.interface';

@ApiTags('enum.auth')
@Controller({
    version: '1',
    path: '/auth',
})
export class AuthEnumController {
    constructor(private readonly authEnumService: AuthEnumService) {}

    @Response('auth.enum.accessFor', {
        classSerialization: AuthAccessForSerialization,
    })
    @Get('/access-for')
    async accessFor(): Promise<IResponse> {
        const accessFor: string[] = await this.authEnumService.getAccessFor();
        return {
            accessFor,
        };
    }
}
