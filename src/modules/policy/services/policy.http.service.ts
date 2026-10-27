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
import type { IRole } from '@modules/role/interfaces/role.interface';
import { Injectable } from '@nestjs/common';

@Injectable()
export class PolicyHttpService {
    constructor(
        private readonly policyDomain: PolicyDomain,
        private readonly roleDomain: RoleDomain,
        private readonly policyAbilityDomain: PolicyAbilityDomain
    ) {}

    private async loadWritableRole(roleId: string): Promise<IRole> {
        const role = await this.roleDomain.getOne(roleId);
        this.policyAbilityDomain.authorize(
            EnumPolicyAction.update,
            subject(EnumPolicySubject.Role, role)
        );

        return role;
    }

    async listByAdmin(
        roleId: string
    ): Promise<IResponseReturn<PolicyListResponseDto>> {
        const scopeWhere = this.policyAbilityDomain.scope(
            EnumPolicyAction.read,
            EnumPolicySubject.Role
        );
        const policies = await this.policyDomain.findManyByRole(roleId, {
            role: scopeWhere,
        });

        return {
            data: { policies },
        };
    }

    async listBySystem(
        roleId: string
    ): Promise<IResponseReturn<PolicyListResponseDto>> {
        const policies = await this.policyDomain.findManyByRole(roleId, {});

        return {
            data: { policies },
        };
    }

    async createByAdmin(
        roleId: string,
        body: PolicyCreateRequestDto
    ): Promise<IResponseReturn<PolicyDto>> {
        const role = await this.loadWritableRole(roleId);
        const created = await this.policyDomain.createByAdmin(role, body);

        return { data: created };
    }

    async updateByAdmin(
        roleId: string,
        id: string,
        body: PolicyUpdateRequestDto
    ): Promise<IResponseReturn<PolicyDto>> {
        const role = await this.loadWritableRole(roleId);
        const updated = await this.policyDomain.updateByAdmin(role, id, body);

        return { data: updated };
    }

    async deleteByAdmin(
        roleId: string,
        id: string
    ): Promise<IResponseReturn<void>> {
        const role = await this.loadWritableRole(roleId);
        await this.policyDomain.deleteByAdmin(role, id);

        return {};
    }
}
