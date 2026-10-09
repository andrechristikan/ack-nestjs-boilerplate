import { subject } from '@casl/ability';
import type { IResponseReturn } from '@common/response/interfaces/response.interface';
import type { PolicyDto } from '@modules/policy/dtos/policy.dto';
import type { PolicyCreateRequestDto } from '@modules/policy/dtos/request/policy.create.request.dto';
import type { PolicyUpdateRequestDto } from '@modules/policy/dtos/request/policy.update.request.dto';
import type { PolicyListResponseDto } from '@modules/policy/dtos/response/policy.list.response.dto';
import {
    EnumPolicyAction,
    EnumPolicySubject,
} from '@generated/prisma-client/client';
import { PolicyAbilityDomain } from '@modules/policy/domains/policy.ability.domain';
import { PolicyDomain } from '@modules/policy/domains/policy.domain';
import { RoleDomain } from '@modules/role/domains/role.domain';
import { Injectable } from '@nestjs/common';

@Injectable()
export class PolicyHttpService {
    constructor(
        private readonly policyDomain: PolicyDomain,
        private readonly roleDomain: RoleDomain,
        private readonly policyAbilityDomain: PolicyAbilityDomain
    ) {}

    async listByAdmin(
        roleId: string
    ): Promise<IResponseReturn<PolicyListResponseDto>> {
        const accessibleWhere = this.policyAbilityDomain.accessibleWhere(
            EnumPolicyAction.read,
            EnumPolicySubject.Role
        );
        const policies = await this.policyDomain.findManyByRole(
            roleId,
            accessibleWhere
        );

        return {
            data: { policies },
        };
    }

    async listBySystem(
        roleId: string
    ): Promise<IResponseReturn<PolicyListResponseDto>> {
        const policies = await this.policyDomain.findManyByRole(roleId);

        return {
            data: { policies },
        };
    }

    async createByAdmin(
        roleId: string,
        body: PolicyCreateRequestDto
    ): Promise<IResponseReturn<PolicyDto>> {
        const role = await this.roleDomain.getOne(roleId);
        this.policyAbilityDomain.assertCan(
            EnumPolicyAction.update,
            subject(EnumPolicySubject.Role, role)
        );
        const created = await this.policyDomain.createByAdmin(roleId, body);

        return { data: created };
    }

    async updateByAdmin(
        roleId: string,
        id: string,
        body: PolicyUpdateRequestDto
    ): Promise<IResponseReturn<PolicyDto>> {
        const role = await this.roleDomain.getOne(roleId);
        this.policyAbilityDomain.assertCan(
            EnumPolicyAction.update,
            subject(EnumPolicySubject.Role, role)
        );
        const updated = await this.policyDomain.updateByAdmin(roleId, id, body);

        return { data: updated };
    }

    async deleteByAdmin(
        roleId: string,
        id: string
    ): Promise<IResponseReturn<void>> {
        const role = await this.roleDomain.getOne(roleId);
        this.policyAbilityDomain.assertCan(
            EnumPolicyAction.update,
            subject(EnumPolicySubject.Role, role)
        );
        await this.policyDomain.deleteByAdmin(roleId, id);

        return {};
    }
}
