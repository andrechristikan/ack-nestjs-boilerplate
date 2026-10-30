import type { IResponseReturn } from '@common/response/interfaces/response.interface';
import { EnumActivityLogAction } from '@generated/prisma-client/client';
import { ActivityLogDomain } from '@modules/activity-log/domains/activity-log.domain';
import type { PolicyDto } from '@modules/policy/dtos/policy.dto';
import type { PolicyRequestDto } from '@modules/policy/dtos/request/policy.request.dto';
import type { PolicyUpdateRequestDto } from '@modules/policy/dtos/request/policy.update.request.dto';
import type { PolicyListResponseDto } from '@modules/policy/dtos/response/policy.list.response.dto';
import { PolicyDomain } from '@modules/policy/domains/policy.domain';
import { RoleDomain } from '@modules/role/domains/role.domain';
import type { IUser } from '@modules/user/interfaces/user.interface';
import { Injectable } from '@nestjs/common';

@Injectable()
export class PolicyHttpService {
    constructor(
        private readonly policyDomain: PolicyDomain,
        private readonly roleDomain: RoleDomain,
        private readonly activityLogDomain: ActivityLogDomain
    ) {}

    async listByRole(
        roleId: string
    ): Promise<IResponseReturn<PolicyListResponseDto>> {
        // Sequential by design: gate before the work it guards
        await this.roleDomain.assertExistsById(roleId);

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
        // Sequential by design: gate before the work it guards
        await this.roleDomain.assertWritableByActor(roleId, {
            roleId: user.roleId,
            roleType: user.role.type,
        });

        const activityLogs = [
            this.activityLogDomain.prepare({
                action: EnumActivityLogAction.adminPolicyCreate,
            }),
        ];
        const created = await this.policyDomain.createByAdmin(roleId, body);

        this.activityLogDomain.stagePrepared(activityLogs);

        return { data: created };
    }

    async updateByAdmin(
        roleId: string,
        id: string,
        body: PolicyUpdateRequestDto,
        user: IUser
    ): Promise<IResponseReturn<PolicyDto>> {
        // Sequential by design: gate before the work it guards
        await this.roleDomain.assertWritableByActor(roleId, {
            roleId: user.roleId,
            roleType: user.role.type,
        });

        const activityLogs = [
            this.activityLogDomain.prepare({
                action: EnumActivityLogAction.adminPolicyUpdate,
            }),
        ];
        const updated = await this.policyDomain.updateByAdmin(roleId, id, body);

        this.activityLogDomain.stagePrepared(activityLogs);

        return { data: updated };
    }

    async deleteByAdmin(
        roleId: string,
        id: string,
        user: IUser
    ): Promise<IResponseReturn<void>> {
        // Sequential by design: gate before the work it guards
        await this.roleDomain.assertWritableByActor(roleId, {
            roleId: user.roleId,
            roleType: user.role.type,
        });

        const activityLogs = [
            this.activityLogDomain.prepare({
                action: EnumActivityLogAction.adminPolicyDelete,
            }),
        ];
        await this.policyDomain.deleteByAdmin(roleId, id);

        this.activityLogDomain.stagePrepared(activityLogs);

        return {};
    }
}
