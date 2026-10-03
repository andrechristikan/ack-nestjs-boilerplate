import { Injectable } from '@nestjs/common';
import { ForbiddenError } from '@casl/ability';
import { accessibleBy } from '@casl/prisma';
import {
    EnumPolicyAction,
    EnumPolicySubject,
} from '@generated/prisma-client/client';
import { RequestContextMissingException } from '@common/request/exceptions/request.context-missing.exception';
import { RequestStoreService } from '@common/request/services/request.store.service';
import { PolicyForbiddenException } from '@modules/policy/exceptions/policy.forbidden.exception';
import type {
    IEffectivePermission,
    PolicyAbility,
    PolicyAbilitySubject,
} from '@modules/policy/interfaces/policy.interface';

/** Reads required request context and answers what a built ability allows. */
@Injectable()
export class PolicyAbilityDomain {
    constructor(private readonly requestStoreService: RequestStoreService) {}

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
