import { PolicyImmutableException } from '@modules/policy/exceptions/policy.immutable.exception';
import { PolicyForbiddenException } from '@modules/policy/exceptions/policy.forbidden.exception';
import { PolicyNotFoundException } from '@modules/policy/exceptions/policy.not-found.exception';
import {
    PolicyAbilityChainByScope,
    PolicyAbilityStoreKeyByScope,
} from '@modules/policy/constants/policy.constant';
import type { EnumPolicyAbilityScope } from '@modules/policy/enums/policy.enum';
import { PolicyAbilityFactory } from '@modules/policy/factories/policy.factory';
import type {
    IEffectivePermission,
    PolicyAbility,
    PolicyAbilityRule,
    PolicyAbilitySubject,
} from '@modules/policy/interfaces/policy.interface';
import type { PolicyCreateRequestDto } from '@modules/policy/dtos/request/policy.create.request.dto';
import type { PolicyUpdateRequestDto } from '@modules/policy/dtos/request/policy.update.request.dto';
import { PolicyRepository } from '@modules/policy/repositories/policy.repository';
import { RoleNotFoundException } from '@modules/role/exceptions/role.not-found.exception';
import { RoleDomain } from '@modules/role/domains/role.domain';
import { EnumRolePlatformKey } from '@modules/role/enums/role.platform-key.enum';
import type { IRole } from '@modules/role/interfaces/role.interface';
import { ActivityLogDomain } from '@modules/activity-log/domains/activity-log.domain';
import { Injectable } from '@nestjs/common';
import { RequestContextMissingException } from '@common/request/exceptions/request.context-missing.exception';
import { RequestStoreService } from '@common/request/services/request.store.service';
import { ForbiddenError } from '@casl/ability';
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
        private readonly activityLogDomain: ActivityLogDomain,
        private readonly requestStoreService: RequestStoreService,
        private readonly policyAbilityFactory: PolicyAbilityFactory
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

    /** Reads a value an earlier guard stored for the request, and throws `RequestContextMissingException` naming the key when nothing is stored. The one place a guard or an HTTP service reads required request context. */
    requireStored<T>(key: string): T {
        const value = this.requestStoreService.get<T>(key);
        if (value === null) {
            throw new RequestContextMissingException(key);
        }

        return value;
    }

    /**
     * Composes the ability of `scope` at check time: reads every layer stored under the keys of
     * `PolicyAbilityChainByScope[scope]` through `requireStored`, concatenates their rules, and
     * builds one ability. Inverted rules are ordered last, so a deny from any layer stays authoritative.
     */
    requireComposedAbility(scope: EnumPolicyAbilityScope): PolicyAbility {
        const rules: PolicyAbilityRule[] = [];
        for (const layer of PolicyAbilityChainByScope[scope]) {
            const ability = this.requireStored<PolicyAbility>(
                PolicyAbilityStoreKeyByScope[layer]
            );
            rules.push(...ability.rules);
        }

        return this.policyAbilityFactory.build(rules);
    }

    /** Returns the Prisma where clause for a subject, or null when the ability has no rules for it. */
    accessibleWhere<TWhere = Record<string, unknown>>(
        ability: PolicyAbility,
        action: EnumPolicyAction,
        subjectName: EnumPolicySubject
    ): TWhere | null {
        if (ability.rulesFor(action, subjectName).length === 0) {
            return null;
        }

        return accessibleBy(ability, action).ofType(subjectName) as TWhere;
    }

    /** Returns the Prisma where clause for a subject, and throws `PolicyForbiddenException` when the ability holds no rule for it, so a caller never queries without the predicate. */
    requireAccessibleWhere<TWhere = Record<string, unknown>>(
        ability: PolicyAbility,
        action: EnumPolicyAction,
        subjectName: EnumPolicySubject
    ): TWhere {
        const where = this.accessibleWhere<TWhere>(
            ability,
            action,
            subjectName
        );
        if (where === null) {
            throw new PolicyForbiddenException();
        }

        return where;
    }

    /**
     * Throws `PolicyForbiddenException` when the provided ability denies `action` on the
     * subject, carrying the matched rule's `reason` when one is present.
     */
    assertCan(
        ability: PolicyAbility,
        action: EnumPolicyAction,
        target: PolicyAbilitySubject
    ): void {
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

    /**
     * Reports the concrete `EnumPolicyAction` members the ability grants for each subject; a
     * subject the ability grants nothing on is omitted.
     */
    getEffectivePermissions(
        ability: PolicyAbility,
        subjects: EnumPolicySubject[]
    ): IEffectivePermission[] {
        return subjects
            .map(subjectName => ({
                subject: subjectName,
                actions: Object.values(EnumPolicyAction).filter(action =>
                    ability.can(action, subjectName)
                ),
            }))
            .filter(permission => permission.actions.length > 0);
    }

    async findManyByRole(roleId: string): Promise<Policy[]> {
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
