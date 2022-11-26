import { Controller, Get } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { Response } from 'src/common/response/decorators/response.decorator';
import { IResponse } from 'src/common/response/interfaces/response.interface';
import { PermissionEnumGroupDoc } from 'src/modules/permission/docs/permission.enum.doc';
import { PermissionGroupSerialization } from 'src/modules/permission/serializations/permission.group.serialization';
import { PermissionEnumService } from 'src/modules/permission/services/permission.enum.service';

@ApiTags('enum.permission')
@Controller({
    version: '1',
    path: '/permission',
})
export class PermissionEnumController {
    constructor(
        private readonly permissionEnumService: PermissionEnumService
    ) {}

    @PermissionEnumGroupDoc()
    @Response('permission.enum.group', {
        serialization: PermissionGroupSerialization,
    })
    @Get('/group')
    async group(): Promise<IResponse> {
        const group: string[] = await this.permissionEnumService.getGroup();
        return {
            group,
        };
    }
}
