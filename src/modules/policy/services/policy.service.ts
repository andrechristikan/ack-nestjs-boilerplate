import { CacheService } from '@common/cache/services/cache.service';
import type { IDatabaseTransactionClient } from '@common/database/interfaces/database.client.interface';
import {
    EnumPolicyAction,
    EnumRoleScope,
} from '@generated/prisma-client/client';
import type { Policy } from '@generated/prisma-client/client';
import { PolicyCache } from '@modules/policy/caches/policy.cache';
import {
    PolicyNonModelSubjects,
    PolicyRulesCacheSchema,
} from '@modules/policy/constants/policy.constant';
import { PolicyRoleScopeSubjectContract } from '@modules/policy/contracts/policy.role-scope-subject.contract';
import { EnumPolicyInvalidRuleReason } from '@modules/policy/enums/policy.enum';
import { PolicyImmutableException } from '@modules/policy/exceptions/policy.immutable.exception';
import { PolicyInvalidRuleException } from '@modules/policy/exceptions/policy.invalid-rule.exception';
import { PolicyNotFoundException } from '@modules/policy/exceptions/policy.not-found.exception';
import type {
    IPolicyCreate,
    IPolicyRoleRevision,
    IPolicyRule,
    IPolicyRuleInput,
    IPolicyUpdate,
} from '@modules/policy/interfaces/policy.interface';
import { PolicyRepository } from '@modules/policy/repositories/policy.repository';
import { EnumRolePlatformKey } from '@modules/role/enums/role.enum';
import type { IRoleRef } from '@modules/role/interfaces/role.interface';
import { Injectable } from '@nestjs/common';

@Injectable()
export class PolicyService {
    constructor(
        private readonly policyRepository: PolicyRepository,
        private readonly cacheService: CacheService,
        private readonly policyCache: PolicyCache
    ) {}

    /** The rules of every role revision, read through the cache, in reference order (later rules take priority). */
    async getRulesByRoleRevisions(
        roleRevisions: IPolicyRoleRevision[]
    ): Promise<IPolicyRule[]> {
        const reads = roleRevisions.map(({ roleId, policyRevision }) => {
            const key = this.policyCache.buildPolicyRulesKey(
                roleId,
                policyRevision
            );

            return this.cacheService.readThrough(
                key,
                PolicyRulesCacheSchema,
                this.policyCache.cacheTtlInMs,
                () => this.policyRepository.findManyRulesByRoleId(roleId)
            );
        });
        const rulesByRole = await Promise.all(reads);

        return rulesByRole.flat();
    }

    /** The super administrator role's policies stay fixed. */
    assertRoleWritable(role: IRoleRef): void {
        if (
            role.scope === EnumRoleScope.platform &&
            role.key === EnumRolePlatformKey.superAdmin
        ) {
            throw new PolicyImmutableException();
        }
    }

    /** Structural check of one authored rule against its role's scope; throws with the first failing reason. */
    validateRule(scope: EnumRoleScope, rule: IPolicyRuleInput): void {
        if (rule.action.length === 0) {
            throw new PolicyInvalidRuleException(
                EnumPolicyInvalidRuleReason.actionEmpty
            );
        }

        const actions = Object.values<string>(EnumPolicyAction);
        if (rule.action.some(action => !actions.includes(action))) {
            throw new PolicyInvalidRuleException(
                EnumPolicyInvalidRuleReason.actionInvalid
            );
        }

        if (new Set(rule.action).size !== rule.action.length) {
            throw new PolicyInvalidRuleException(
                EnumPolicyInvalidRuleReason.actionDuplicate
            );
        }

        if (!PolicyRoleScopeSubjectContract[scope].includes(rule.subject)) {
            throw new PolicyInvalidRuleException(
                EnumPolicyInvalidRuleReason.roleScopeInvalid
            );
        }

        if (
            rule.conditions !== null &&
            PolicyNonModelSubjects.includes(rule.subject)
        ) {
            throw new PolicyInvalidRuleException(
                EnumPolicyInvalidRuleReason.conditionsNotAllowed
            );
        }
    }

    async getManyByRole(roleId: string): Promise<Policy[]> {
        return this.policyRepository.findManyByRoleId(roleId);
    }

    async getOneByRoleIdAndId(roleId: string, id: string): Promise<Policy> {
        const policy = await this.policyRepository.findOneByRoleIdAndId(
            roleId,
            id
        );
        if (!policy) {
            throw new PolicyNotFoundException();
        }

        return policy;
    }

    async createByAdminInTx(
        tx: IDatabaseTransactionClient,
        roleId: string,
        data: IPolicyCreate
    ): Promise<Policy> {
        return this.policyRepository.createInTx(tx, roleId, data);
    }

    async updateByAdminInTx(
        tx: IDatabaseTransactionClient,
        roleId: string,
        id: string,
        data: IPolicyUpdate
    ): Promise<Policy> {
        const updated = await this.policyRepository.updateInTx(
            tx,
            roleId,
            id,
            data
        );
        if (!updated) {
            throw new PolicyNotFoundException();
        }

        return updated;
    }

    async deleteByAdminInTx(
        tx: IDatabaseTransactionClient,
        roleId: string,
        id: string
    ): Promise<Policy> {
        // Sequential by design: gate before the work it guards
        const policy = await this.policyRepository.findOneByRoleIdAndIdInTx(
            tx,
            roleId,
            id
        );
        if (!policy) {
            throw new PolicyNotFoundException();
        }

        const deleted = await this.policyRepository.deleteInTx(tx, roleId, id);
        if (!deleted) {
            throw new PolicyNotFoundException();
        }

        return policy;
    }
}
