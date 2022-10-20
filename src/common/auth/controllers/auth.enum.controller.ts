import { Controller, Get } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { AuthEnumAccessForDoc } from 'src/common/auth/docs/auth.enum.doc';
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

    @AuthEnumAccessForDoc()
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
