import { PolicyImmutableException } from '@modules/policy/exceptions/policy.immutable.exception';
import { PolicyForbiddenException } from '@modules/policy/exceptions/policy.forbidden.exception';
import { PolicyNotFoundException } from '@modules/policy/exceptions/policy.not-found.exception';
import type { IPolicyAbility } from '@modules/policy/interfaces/policy.interface';
import type { PolicyCreateRequestDto } from '@modules/policy/dtos/request/policy.create.request.dto';
import type { PolicyUpdateRequestDto } from '@modules/policy/dtos/request/policy.update.request.dto';
import { PolicyRepository } from '@modules/policy/repositories/policy.repository';
import { RoleNotFoundException } from '@modules/role/exceptions/role.not-found.exception';
import { RoleDomain } from '@modules/role/domains/role.domain';
import { EnumRolePlatformKey } from '@modules/role/enums/role.platform-key.enum';
import type { IRole } from '@modules/role/interfaces/role.interface';
import { ActivityLogDomain } from '@modules/activity-log/domains/activity-log.domain';
import { Injectable } from '@nestjs/common';
import { ForbiddenError, subject } from '@casl/ability';
import { accessibleBy } from '@casl/prisma';
import {
    EnumActivityLogAction,
    EnumPolicyAction,
    EnumPolicySubject,
    EnumRoleScope,
} from '@generated/prisma-client/client';
import type { Policy } from '@generated/prisma-client/client';

@Injectable()
export class PolicyDomain {
    constructor(
        private readonly policyRepository: PolicyRepository,
        private readonly roleDomain: RoleDomain,
        private readonly activityLogDomain: ActivityLogDomain
    ) {}

    private async validateRoleExists(roleId: string): Promise<IRole> {
        const role = await this.roleDomain.getById(roleId);
        if (!role) {
            throw new RoleNotFoundException();
        }

        return role;
    }

    private async validateRoleWritable(roleId: string): Promise<void> {
        const role = await this.validateRoleExists(roleId);
        if (
            role.scope === EnumRoleScope.platform &&
            role.key === EnumRolePlatformKey.superAdmin
        ) {
            throw new PolicyImmutableException();
        }
    }

    /** Returns the Prisma where clause for a subject, or null when the ability has no rules for it. */
    accessibleWhere(
        ability: IPolicyAbility,
        action: EnumPolicyAction,
        subjectName: EnumPolicySubject
    ): Record<string, unknown> | null {
        const caslSubject = subjectName;

        if (ability.rulesFor(action, caslSubject).length === 0) {
            return null;
        }

        return accessibleBy(ability, action).ofType(caslSubject) as Record<
            string,
            unknown
        >;
    }

    /**
     * Throws `PolicyForbiddenException` when the provided ability denies `action` on the
     * subject, carrying the matched rule's `reason` when one is present.
     */
    assertCan(
        ability: IPolicyAbility,
        action: EnumPolicyAction,
        subjectName: EnumPolicySubject,
        record?: object
    ): void {
        const target =
            record === undefined ? subjectName : subject(subjectName, record);

        try {
            ForbiddenError.from(ability).throwUnlessCan(action, target);
        } catch (error) {
            if (!(error instanceof ForbiddenError)) {
                throw error;
            }

            const matchedRule = ability.relevantRuleFor(action, target);
            const reason = matchedRule?.inverted
                ? matchedRule.reason
                : undefined;
            throw new PolicyForbiddenException(reason);
        }
    }

    async findManyByRole(roleId: string): Promise<Policy[]> {
        await this.validateRoleExists(roleId);

        return this.policyRepository.findManyByRoleId(roleId);
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

        this.activityLogDomain.stagePrepared(events);

        return deleted;
    }
}
