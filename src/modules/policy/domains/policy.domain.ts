import { PolicyImmutableException } from '@modules/policy/exceptions/policy.immutable.exception';
import { PolicyNotFoundException } from '@modules/policy/exceptions/policy.not-found.exception';
import type { PolicyCreateRequestDto } from '@modules/policy/dtos/request/policy.create.request.dto';
import type { PolicyUpdateRequestDto } from '@modules/policy/dtos/request/policy.update.request.dto';
import { PolicyCache } from '@modules/policy/caches/policy.cache';
import type { IPolicyRule } from '@modules/policy/interfaces/policy.interface';
import { PolicyRepository } from '@modules/policy/repositories/policy.repository';
import { RoleNotFoundException } from '@modules/role/exceptions/role.not-found.exception';
import { RoleDomain } from '@modules/role/domains/role.domain';
import { EnumRolePlatformKey } from '@modules/role/enums/role.platform-key.enum';
import { ActivityLogDomain } from '@modules/activity-log/domains/activity-log.domain';
import { Injectable } from '@nestjs/common';
import {
    EnumActivityLogAction,
    EnumRoleScope,
} from '@generated/prisma-client/client';
import type { Policy } from '@generated/prisma-client/client';

@Injectable()
export class PolicyDomain {
    constructor(
        private readonly policyRepository: PolicyRepository,
        private readonly policyCache: PolicyCache,
        private readonly roleDomain: RoleDomain,
        private readonly activityLogDomain: ActivityLogDomain
    ) {}

    private async validateRoleWritable(roleId: string): Promise<void> {
        const role = await this.roleDomain.getById(roleId);
        if (!role) {
            throw new RoleNotFoundException();
        }

        if (
            role.scope === EnumRoleScope.platform &&
            role.key === EnumRolePlatformKey.superAdmin
        ) {
            throw new PolicyImmutableException();
        }
    }

    async findManyByRole(roleId: string): Promise<Policy[]> {
        return this.policyRepository.findManyByRoleId(roleId);
    }

    /** Returns the policy rows of every role, read through the policy cache. */
    async findManyByRoleIds(...roleIds: string[]): Promise<IPolicyRule[]> {
        return this.policyCache.getByRoleIdsAndCache(roleIds);
    }

    async createByAdmin(
        roleId: string,
        dto: PolicyCreateRequestDto
    ): Promise<Policy> {
        await this.validateRoleWritable(roleId);

        const events = [
            this.activityLogDomain.prepare({
                action: EnumActivityLogAction.adminPolicyCreate,
            }),
        ];

        const created = await this.policyRepository.create(roleId, dto);
        await this.policyCache.deleteCacheByRoleId(roleId);

        this.activityLogDomain.stagePrepared(events);

        return created;
    }

    async updateByAdmin(
        roleId: string,
        id: string,
        dto: PolicyUpdateRequestDto
    ): Promise<Policy> {
        await this.validateRoleWritable(roleId);

        const stored = await this.policyRepository.findOneByRoleIdAndId(
            roleId,
            id
        );
        if (!stored) {
            throw new PolicyNotFoundException();
        }

        const events = [
            this.activityLogDomain.prepare({
                action: EnumActivityLogAction.adminPolicyUpdate,
            }),
        ];

        const updated = await this.policyRepository.update(id, dto);
        await this.policyCache.deleteCacheByRoleId(roleId);

        this.activityLogDomain.stagePrepared(events);

        return updated;
    }

    async deleteByAdmin(roleId: string, id: string): Promise<Policy> {
        await this.validateRoleWritable(roleId);

        const policyExists = await this.policyRepository.existsByRoleIdAndId(
            roleId,
            id
        );
        if (!policyExists) {
            throw new PolicyNotFoundException();
        }

        const events = [
            this.activityLogDomain.prepare({
                action: EnumActivityLogAction.adminPolicyDelete,
            }),
        ];
        const deleted = await this.policyRepository.delete(id);
        await this.policyCache.deleteCacheByRoleId(roleId);

        this.activityLogDomain.stagePrepared(events);

        return deleted;
    }
}
