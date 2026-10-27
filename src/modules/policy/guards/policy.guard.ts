import type { CanActivate, ExecutionContext } from '@nestjs/common';
import { Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import type {
    EnumPolicyAction,
    EnumPolicySubject,
} from '@generated/prisma-client/client';
import {
    PolicyAbilityStoreKey,
    PolicyRequiredMetaKey,
} from '@modules/policy/constants/policy.constant';
import { PolicyAbilityDomain } from '@modules/policy/domains/policy.ability.domain';
import { PolicyForbiddenException } from '@modules/policy/exceptions/policy.forbidden.exception';
import { PolicyPredefinedNotFoundException } from '@modules/policy/exceptions/policy.predefined-not-found.exception';
import type {
    IPolicyRequired,
    PolicyAbility,
} from '@modules/policy/interfaces/policy.interface';

@Injectable()
export class PolicyGuard implements CanActivate {
    constructor(
        private readonly reflector: Reflector,
        private readonly policyAbilityDomain: PolicyAbilityDomain
    ) {}

    /**
     * Throws one `PolicyForbiddenException` listing every required action the ability
     * denies, grouped by subject, carrying the `reason` of the first denying inverted rule.
     */
    private assertCanEvery(
        ability: PolicyAbility,
        required: IPolicyRequired[]
    ): void {
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

    canActivate(context: ExecutionContext): boolean {
        const required = this.reflector.get<IPolicyRequired[] | undefined>(
            PolicyRequiredMetaKey,
            context.getHandler()
        );
        if (!required || required.length === 0) {
            throw new PolicyPredefinedNotFoundException();
        }

        const ability = this.policyAbilityDomain.requireStored<PolicyAbility>(
            PolicyAbilityStoreKey
        );
        this.assertCanEvery(ability, required);

        return true;
    }
}
