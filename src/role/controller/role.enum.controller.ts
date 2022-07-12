import { Controller, Get } from '@nestjs/common';
import { Response } from 'src/utils/response/response.decorator';
import { IResponse } from 'src/utils/response/response.interface';
import { RoleService } from '../service/role.service';

@Controller({
    version: '1',
    path: 'role',
})
export class RoleEnumController {
    constructor(private readonly roleService: RoleService) {}

    @Response('message.enum.accessFor')
    @Get('/access-for')
    async accessFor(): Promise<IResponse> {
        const accessFor: string[] = await this.roleService.getAccessFor();
        return {
            accessFor,
        };
    }
}
