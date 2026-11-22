import type { IResponseReturn } from '@common/response/interfaces/response.interface';
import type { PolicyListResponseDto } from '@modules/policy/dtos/response/policy.list.response.dto';
import { PolicyService } from '@modules/policy/services/policy.service';
import { RoleService } from '@modules/role/services/role.service';
import { Injectable } from '@nestjs/common';
import type { IAppUseCase } from '@app/interfaces/app.use-case.interface';

@Injectable()
export class PolicyListByRoleUseCase implements IAppUseCase<
    [string],
    IResponseReturn<PolicyListResponseDto>
> {
    constructor(
        private readonly policyService: PolicyService,
        private readonly roleService: RoleService
    ) {}

    async execute(
        roleId: string
    ): Promise<IResponseReturn<PolicyListResponseDto>> {
        // Sequential by design: gate before the work it guards
        await this.roleService.assertExistsById(roleId);

        const policies = await this.policyService.getManyByRole(roleId);

        return {
            data: { policies },
        };
    }
}
