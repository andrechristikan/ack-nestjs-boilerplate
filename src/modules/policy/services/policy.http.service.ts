import { IResponseReturn } from '@common/response/interfaces/response.interface';
import { PolicyDto } from '@modules/policy/dtos/policy.dto';
import { PolicyRequestDto } from '@modules/policy/dtos/request/policy.request.dto';
import { PolicyUpdateRequestDto } from '@modules/policy/dtos/request/policy.update.request.dto';
import { PolicyListResponseDto } from '@modules/policy/dtos/response/policy.list.response.dto';
import { IPolicyHttpService } from '@modules/policy/interfaces/policy.http.service.interface';
import { PolicyService } from '@modules/policy/services/policy.service';
import { Injectable } from '@nestjs/common';

@Injectable()
export class PolicyHttpService implements IPolicyHttpService {
    constructor(private readonly policyService: PolicyService) {}

    async listByRole(
        roleId: string
    ): Promise<IResponseReturn<PolicyListResponseDto>> {
        const policies = await this.policyService.findManyByRole(roleId);

        return {
            data: { policies },
        };
    }

    async createByAdmin(
        roleId: string,
        body: PolicyRequestDto
    ): Promise<IResponseReturn<PolicyDto>> {
        const created = await this.policyService.createByAdmin(roleId, body);

        return { data: created };
    }

    async updateByAdmin(
        roleId: string,
        id: string,
        body: PolicyUpdateRequestDto
    ): Promise<IResponseReturn<PolicyDto>> {
        const updated = await this.policyService.updateByAdmin(
            roleId,
            id,
            body
        );

        return { data: updated };
    }

    async deleteByAdmin(
        roleId: string,
        id: string
    ): Promise<IResponseReturn<void>> {
        await this.policyService.deleteByAdmin(roleId, id);

        return {};
    }
}
