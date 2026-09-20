import type { IResponseReturn } from '@common/response/interfaces/response.interface';
import type { PolicyDto } from '@modules/policy/dtos/policy.dto';
import type { PolicyRequestDto } from '@modules/policy/dtos/request/policy.request.dto';
import type { PolicyUpdateRequestDto } from '@modules/policy/dtos/request/policy.update.request.dto';
import type { PolicyListResponseDto } from '@modules/policy/dtos/response/policy.list.response.dto';
import { PolicyDomain } from '@modules/policy/domains/policy.domain';
import { Injectable } from '@nestjs/common';

@Injectable()
export class PolicyHttpService {
    constructor(private readonly policyDomain: PolicyDomain) {}

    async listByRole(
        roleId: string
    ): Promise<IResponseReturn<PolicyListResponseDto>> {
        const policies = await this.policyDomain.findManyByRole(roleId);

        return {
            data: { policies },
        };
    }

    async createByAdmin(
        roleId: string,
        body: PolicyRequestDto
    ): Promise<IResponseReturn<PolicyDto>> {
        const created = await this.policyDomain.createByAdmin(roleId, body);

        return { data: created };
    }

    async updateByAdmin(
        roleId: string,
        id: string,
        body: PolicyUpdateRequestDto
    ): Promise<IResponseReturn<PolicyDto>> {
        const updated = await this.policyDomain.updateByAdmin(roleId, id, body);

        return { data: updated };
    }

    async deleteByAdmin(
        roleId: string,
        id: string
    ): Promise<IResponseReturn<void>> {
        await this.policyDomain.deleteByAdmin(roleId, id);

        return {};
    }
}
