import { createPrismaAbility } from '@casl/prisma';
import type { Policy } from '@generated/prisma-client/client';
import type {
    IPolicyConditions,
    PolicyAbility,
    PolicyAbilityRule,
    PolicyPlaceholderValues,
} from '@modules/policy/interfaces/policy.interface';
import { Injectable } from '@nestjs/common';

/** Builds the typed Prisma CASL ability from policy rules. */
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
                typeof value === 'string' && /^\$\{[^}]+\}$/.test(value);
            const resolved = isPlaceholder ? values[value] : value;
            if (resolved === undefined) {
                return null;
            }

            entries[key] = resolved;
        }

        if (!this.isPlainJsonObject(entries)) {
            return null;
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

    /** Builds a resolved ability from the supplied persisted policies. */
    buildFromPolicies(
        policies: Policy[] | null,
        placeholders: PolicyPlaceholderValues
    ): PolicyAbility {
        const rules: PolicyAbilityRule[] = [];
        for (const policy of policies ?? []) {
            const rule = this.toAbilityRule(policy, placeholders);
            if (rule !== null) {
                rules.push(rule);
            }
        }

        return this.build(rules);
    }
}
