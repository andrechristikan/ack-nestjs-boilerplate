import { Injectable } from '@nestjs/common';
import { ForbiddenError } from '@casl/ability';
import { accessibleBy } from '@casl/prisma';
import {
    EnumPolicyAction,
    EnumPolicySubject,
} from '@generated/prisma-client/client';
import { RequestContextMissingException } from '@common/request/exceptions/request.context-missing.exception';
import { RequestStoreService } from '@common/request/services/request.store.service';
import { PolicyAbilityStoreKey } from '@modules/policy/constants/policy.constant';
import { PolicyForbiddenException } from '@modules/policy/exceptions/policy.forbidden.exception';
import type {
    IEffectivePermission,
    IPolicyRequired,
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

    /** Reads the ability `PolicyAbilityGuard` stored for the request. */
    private getAbility(): PolicyAbility {
        return this.requireStored<PolicyAbility>(PolicyAbilityStoreKey);
    }

    /** Returns the Prisma where clause the stored ability grants for a subject, and throws `PolicyForbiddenException` when the ability holds no rule for it, so a caller never queries without the predicate. */
    accessibleWhere<TWhere = Record<string, unknown>>(
        action: EnumPolicyAction,
        subjectName: EnumPolicySubject
    ): TWhere {
        const ability = this.getAbility();
        if (ability.rulesFor(action, subjectName).length === 0) {
            throw new PolicyForbiddenException({
                missing: [{ subject: subjectName, actions: [action] }],
            });
        }

        return accessibleBy(ability, action).ofType(subjectName) as TWhere;
    }

    /**
     * Throws `PolicyForbiddenException` when the stored ability denies `action` on the
     * subject, carrying the matched rule's `reason` when one is present and the missing
     * permission.
     */
    assertCan(action: EnumPolicyAction, target: PolicyAbilitySubject): void {
        const ability = this.getAbility();
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
            throw new PolicyForbiddenException({
                reason,
                missing: [
                    {
                        subject: this.toSubjectName(target),
                        actions: [action],
                    },
                ],
            });
        }
    }

    /**
     * Throws one `PolicyForbiddenException` listing every required action the stored ability
     * denies, grouped by subject, carrying the `reason` of the first denying inverted rule.
     */
    assertCanEvery(required: IPolicyRequired[]): void {
        const ability = this.getAbility();
        const missing = new Map<EnumPolicySubject, EnumPolicyAction[]>();
        let reason: string | undefined;

        for (const { subject: subjectName, action } of required) {
            for (const one of action) {
                if (ability.can(one, subjectName)) {
                    continue;
                }

                const actions = missing.get(subjectName) ?? [];
                if (!actions.includes(one)) {
                    actions.push(one);
                }
                missing.set(subjectName, actions);

                const matchedRule = ability.relevantRuleFor(one, subjectName);
                if (reason === undefined && matchedRule?.inverted) {
                    reason = matchedRule.reason;
                }
            }
        }

        if (missing.size > 0) {
            throw new PolicyForbiddenException({
                reason,
                missing: [...missing].map(([subject, actions]) => ({
                    subject,
                    actions,
                })),
            });
        }
    }

    /**
     * Reports the concrete `EnumPolicyAction` members the stored ability grants on each target,
     * a subject name or a record tagged with `subject(...)`; a subject the ability grants nothing
     * on is omitted.
     */
    getEffectivePermissions<TSubject extends EnumPolicySubject>(
        targets: PolicyAbilitySubject<TSubject>[]
    ): IEffectivePermission<TSubject>[] {
        const ability = this.getAbility();

        return targets
            .map(target => ({
                subject: this.toSubjectName(target),
                actions: Object.values(EnumPolicyAction).filter(action =>
                    ability.can(action, target)
                ),
            }))
            .filter(permission => permission.actions.length > 0);
    }

    private toSubjectName<TSubject extends EnumPolicySubject>(
        target: PolicyAbilitySubject<TSubject>
    ): TSubject {
        return (
            typeof target === 'string' ? target : target.__caslSubjectType__
        ) as TSubject;
    }
}
