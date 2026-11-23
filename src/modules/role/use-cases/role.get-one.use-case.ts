import type { IResponseReturn } from '@common/response/interfaces/response.interface';
import type { IPolicyContext } from '@modules/policy/interfaces/policy.interface';
import { PolicyAbilityService } from '@modules/policy/services/policy.ability.service';
import {
    EnumPolicyAction,
    EnumPolicySubject,
} from '@generated/prisma-client/client';
import type { RoleDto } from '@modules/role/dtos/role.dto';
import { RoleService } from '@modules/role/services/role.service';
import { Injectable } from '@nestjs/common';
import type { IAppUseCase } from '@app/interfaces/app.use-case.interface';

@Injectable()
export class RoleGetOneUseCase implements IAppUseCase<
    [IPolicyContext, string],
    IResponseReturn<RoleDto>
> {
    constructor(
        private readonly roleService: RoleService,
        private readonly policyAbilityService: PolicyAbilityService
    ) {}

    async execute(
        policyContext: IPolicyContext,
        id: string
    ): Promise<IResponseReturn<RoleDto>> {
        const additionalWhere = this.policyAbilityService.scope(
            policyContext,
            EnumPolicyAction.read,
            EnumPolicySubject.Role
        );
        const role = await this.roleService.getOneWithPolicies(
            id,
            additionalWhere
        );

        return { data: role };
    }
}
