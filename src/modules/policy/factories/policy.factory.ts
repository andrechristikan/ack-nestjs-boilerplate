import { createPrismaAbility } from '@casl/prisma';
import type { Policy } from '@generated/prisma-client/client';
import type {
    IPolicyConditions,
    PolicyAbility,
    PolicyAbilityRule,
    PolicyPlaceholderValues,
} from '@modules/policy/interfaces/policy.interface';
import { PolicyPlaceholderPattern } from '@modules/policy/constants/policy.constant';
import { Injectable } from '@nestjs/common';

/** Resolves persisted policies into rules and builds the typed Prisma CASL ability from them. */
@Injectable()
export class PolicyAbilityFactory {
    private isPlainJsonObject(value: unknown): value is IPolicyConditions {
        return (
            value !== null && typeof value === 'object' && !Array.isArray(value)
        );
    }

    private interpolate(
        conditions: IPolicyConditions,
        values: PolicyPlaceholderValues
    ): IPolicyConditions | null {
        const entries: IPolicyConditions = {};

        for (const [key, value] of Object.entries(conditions)) {
            if (
                value === undefined ||
                (typeof value === 'object' && value !== null) ||
                typeof value === 'function' ||
                typeof value === 'symbol'
            ) {
                return null;
            }

            const isPlaceholder =
                typeof value === 'string' &&
                PolicyPlaceholderPattern.test(value);
            const resolved = isPlaceholder ? values[value] : value;
            if (resolved === undefined) {
                return null;
            }

            entries[key] = resolved;
        }

        return entries;
    }

    private toAbilityRule(
        policy: Policy,
        placeholders: PolicyPlaceholderValues
    ): PolicyAbilityRule | null {
        const { conditions } = policy;
        const resolved =
            conditions === null || !this.isPlainJsonObject(conditions)
                ? null
                : this.interpolate(conditions, placeholders);

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
    build(rules: PolicyAbilityRule[]): PolicyAbility {
        const orderedRules = [
            ...rules.filter(rule => !rule.inverted),
            ...rules.filter(rule => rule.inverted),
        ];

        return createPrismaAbility<PolicyAbility>(orderedRules);
    }

    /**
     * Resolves persisted policies into plain ability rules. A rule whose placeholder has no value,
     * or whose conditions are not flat scalars, is omitted so it fails closed.
     */
    resolveRules(
        policies: Policy[],
        placeholders: PolicyPlaceholderValues
    ): PolicyAbilityRule[] {
        return policies.flatMap(policy => {
            const rule = this.toAbilityRule(policy, placeholders);

            return rule === null ? [] : [rule];
        });
    }
}
