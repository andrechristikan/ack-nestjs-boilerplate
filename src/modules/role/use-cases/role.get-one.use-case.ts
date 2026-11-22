import type { IResponseReturn } from '@common/response/interfaces/response.interface';
import type { RoleDto } from '@modules/role/dtos/role.dto';
import { RoleService } from '@modules/role/services/role.service';
import { Injectable } from '@nestjs/common';
import type { IAppUseCase } from '@app/interfaces/app.use-case.interface';

@Injectable()
export class RoleGetOneUseCase implements IAppUseCase<
    [string],
    IResponseReturn<RoleDto>
> {
    constructor(private readonly roleService: RoleService) {}

    async execute(id: string): Promise<IResponseReturn<RoleDto>> {
        const role = await this.roleService.getOne(id);

        return { data: role };
    }
}
