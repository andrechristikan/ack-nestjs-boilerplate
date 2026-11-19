import type { IResponseReturn } from '@common/response/interfaces/response.interface';
import type { PolicyListResponseDto } from '@modules/policy/dtos/response/policy.list.response.dto';
import { RoleService } from '@modules/role/services/role.service';
import { Injectable } from '@nestjs/common';
import type { IAppUseCase } from '@app/interfaces/app.use-case.interface';

@Injectable()
export class PolicyListByRoleUseCase implements IAppUseCase<
    [string],
    IResponseReturn<PolicyListResponseDto>
> {
    constructor(private readonly roleService: RoleService) {}

    async execute(
        roleId: string
    ): Promise<IResponseReturn<PolicyListResponseDto>> {
        const role = await this.roleService.getOneWithPolicies(roleId);

        return {
            data: { policies: role.policies },
        };
    }
}
