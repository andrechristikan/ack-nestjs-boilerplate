import { createPrismaAbility } from '@casl/prisma';
import type { Policy } from '@generated/prisma-client/client';
import type {
    IPolicyAbility,
    IPolicyAbilityRule,
    IPolicyPlaceholderValues,
} from '@modules/policy/interfaces/policy.interface';
import {
    interpolate,
    isPlainJsonObject,
} from '@modules/policy/utils/policy.condition.util';
import { Injectable } from '@nestjs/common';

/** Builds the typed Prisma CASL ability from policy rules. */
@Injectable()
export class PolicyAbilityFactory {
    private toAbilityRule(
        policy: Policy,
        placeholders: IPolicyPlaceholderValues
    ): IPolicyAbilityRule | null {
        const { conditions } = policy;
        const resolved =
            conditions === null || !isPlainJsonObject(conditions)
                ? null
                : interpolate(conditions, placeholders);

        if (conditions !== null && resolved === null) {
            return null;
        }

        return {
            subject: policy.subject,
            action: policy.action,
            ...(resolved ? { conditions: resolved } : {}),
            inverted: policy.inverted,
            ...(policy.reason ? { reason: policy.reason } : {}),
        };
    }

    /** Inverted rules are added after allows so a matching deny is authoritative. */
    build(rules: IPolicyAbilityRule[]): IPolicyAbility {
        const orderedRules = [
            ...rules.filter(rule => !rule.inverted),
            ...rules.filter(rule => rule.inverted),
        ];

        return createPrismaAbility<IPolicyAbility>(orderedRules);
    }

    /** Builds a resolved ability from the supplied persisted policies. */
    buildFromPolicies(
        policies: Policy[] | null,
        placeholders: IPolicyPlaceholderValues
    ): IPolicyAbility {
        const rules: IPolicyAbilityRule[] = [];
        for (const policy of policies ?? []) {
            const rule = this.toAbilityRule(policy, placeholders);
            if (rule !== null) {
                rules.push(rule);
            }
        }

        return this.build(rules);
    }
}
