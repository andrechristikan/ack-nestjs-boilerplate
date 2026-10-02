import { Injectable } from '@nestjs/common';
import { ForbiddenError } from '@casl/ability';
import { accessibleBy } from '@casl/prisma';
import {
    EnumPolicyAction,
    EnumPolicySubject,
} from '@generated/prisma-client/client';
import { RequestContextMissingException } from '@common/request/exceptions/request.context-missing.exception';
import { RequestStoreService } from '@common/request/services/request.store.service';
import { EnumPolicyConditionPlaceholder } from '@modules/policy/constants/policy.constant';
import { PolicyForbiddenException } from '@modules/policy/exceptions/policy.forbidden.exception';
import { PolicyAbilityFactory } from '@modules/policy/factories/policy.factory';
import type {
    IEffectivePermission,
    IPolicyAbilityBuildInput,
    PolicyAbility,
    PolicyAbilitySubject,
    PolicyPlaceholderValues,
} from '@modules/policy/interfaces/policy.interface';
import { PolicyRepository } from '@modules/policy/repositories/policy.repository';

/** Loads the policies of every role in the request context, builds one ability from them, and answers what that ability allows. */
@Injectable()
export class PolicyAbilityDomain {
    constructor(
        private readonly policyRepository: PolicyRepository,
        private readonly policyAbilityFactory: PolicyAbilityFactory,
        private readonly requestStoreService: RequestStoreService
    ) {}

    /**
     * Builds one ability from every role available in the request context. All roles resolve from
     * one placeholder map: the layer decides which roles load, the context decides which values
     * exist.
     */
    async buildAbility(
        input: IPolicyAbilityBuildInput
    ): Promise<PolicyAbility> {
        const placeholders: PolicyPlaceholderValues = {
            [EnumPolicyConditionPlaceholder.userId]: input.user.id,
            [EnumPolicyConditionPlaceholder.workspaceId]: input.workspace?.id,
            [EnumPolicyConditionPlaceholder.projectId]: input.project?.id,
        };
        const roleIds = [
            input.user.roleId,
            input.workspace?.memberRoleId,
            input.project?.memberRoleId,
        ].filter(roleId => roleId !== undefined && roleId !== null);

        const policiesByRole = await Promise.all(
            roleIds.map(roleId =>
                this.policyRepository.findManyByRoleId(roleId)
            )
        );

        return this.policyAbilityFactory.build(
            policiesByRole.flatMap(policies =>
                this.policyAbilityFactory.resolveRules(policies, placeholders)
            )
        );
    }

    /** Reads a value an earlier guard stored for the request, and throws `RequestContextMissingException` naming the key when nothing is stored. The one place a guard or an HTTP service reads required request context. */
    requireStored<T>(key: string): T {
        const value = this.requestStoreService.get<T>(key);
        if (value === null) {
            throw new RequestContextMissingException(key);
        }

        return value;
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
}
