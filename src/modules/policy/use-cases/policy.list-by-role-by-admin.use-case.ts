import type { IAppUseCase } from '@app/interfaces/app.use-case.interface';
import type { IResponseReturn } from '@common/response/interfaces/response.interface';
import {
    EnumPolicyAction,
    EnumPolicySubject,
} from '@generated/prisma-client/client';
import type { PolicyListResponseDto } from '@modules/policy/dtos/response/policy.list.response.dto';
import type { IPolicyContext } from '@modules/policy/interfaces/policy.interface';
import { PolicyAbilityService } from '@modules/policy/services/policy.ability.service';
import { PolicyService } from '@modules/policy/services/policy.service';
import { RoleService } from '@modules/role/services/role.service';
import { Injectable } from '@nestjs/common';

@Injectable()
export class PolicyListByRoleByAdminUseCase implements IAppUseCase<
    [IPolicyContext, string],
    IResponseReturn<PolicyListResponseDto>
> {
    constructor(
        private readonly policyService: PolicyService,
        private readonly roleService: RoleService,
        private readonly policyAbilityService: PolicyAbilityService
    ) {}

    async execute(
        policyContext: IPolicyContext,
        roleId: string
    ): Promise<IResponseReturn<PolicyListResponseDto>> {
        const additionalWhere = this.policyAbilityService.scope(
            policyContext,
            EnumPolicyAction.read,
            EnumPolicySubject.Role
        );
        // Sequential by design: gate before the work it guards
        await this.roleService.assertExistsById(roleId, additionalWhere);
        const policies = await this.policyService.getManyByRole(roleId);

        return {
            data: { policies },
        };
    }
}
