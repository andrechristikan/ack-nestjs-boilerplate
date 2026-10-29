import type { IResponseReturn } from '@common/response/interfaces/response.interface';
import type { PolicyDto } from '@modules/policy/dtos/policy.dto';
import type { PolicyRequestDto } from '@modules/policy/dtos/request/policy.request.dto';
import type { PolicyUpdateRequestDto } from '@modules/policy/dtos/request/policy.update.request.dto';
import type { PolicyListResponseDto } from '@modules/policy/dtos/response/policy.list.response.dto';
import { PolicyDomain } from '@modules/policy/domains/policy.domain';
import type { IUser } from '@modules/user/interfaces/user.interface';
import { Injectable } from '@nestjs/common';

@Injectable()
export class PolicyHttpService {
    constructor(private readonly policyDomain: PolicyDomain) {}

    async listByRole(
        roleId: string
    ): Promise<IResponseReturn<PolicyListResponseDto>> {
        const policies = await this.policyDomain.getManyByRole(roleId);

        return {
            data: { policies },
        };
    }

    async createByAdmin(
        roleId: string,
        body: PolicyRequestDto,
        user: IUser
    ): Promise<IResponseReturn<PolicyDto>> {
        const created = await this.policyDomain.createByAdmin(roleId, body, {
            roleId: user.roleId,
            roleType: user.role.type,
        });

        return { data: created };
    }

    async updateByAdmin(
        roleId: string,
        id: string,
        body: PolicyUpdateRequestDto,
        user: IUser
    ): Promise<IResponseReturn<PolicyDto>> {
        const updated = await this.policyDomain.updateByAdmin(
            roleId,
            id,
            body,
            { roleId: user.roleId, roleType: user.role.type }
        );

        return { data: updated };
    }

    async deleteByAdmin(
        roleId: string,
        id: string,
        user: IUser
    ): Promise<IResponseReturn<void>> {
        await this.policyDomain.deleteByAdmin(roleId, id, {
            roleId: user.roleId,
            roleType: user.role.type,
        });

        return {};
    }
}
