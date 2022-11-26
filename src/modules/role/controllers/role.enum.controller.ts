import { Controller, Get } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { Response } from 'src/common/response/decorators/response.decorator';
import { IResponse } from 'src/common/response/interfaces/response.interface';
import { RoleEnumAccessForDoc } from 'src/modules/role/docs/role.enum.doc';
import { RoleAccessForSerialization } from 'src/modules/role/serializations/role.access-for.serialization';
import { RoleEnumService } from 'src/modules/role/services/role.enum.service';

@ApiTags('enum.role')
@Controller({
    version: '1',
    path: '/role',
})
export class RoleEnumController {
    constructor(private readonly roleEnumService: RoleEnumService) {}

    @RoleEnumAccessForDoc()
    @Response('role.enum.accessFor', {
        serialization: RoleAccessForSerialization,
    })
    @Get('/access-for')
    async accessFor(): Promise<IResponse> {
        const accessFor: string[] = await this.roleEnumService.getAccessFor();
        return {
            accessFor,
        };
    }
}
