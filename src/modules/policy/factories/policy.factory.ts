import { createPrismaAbility } from '@casl/prisma/runtime';
import type { Prisma } from '@generated/prisma-client/client';
import type {
    IPolicyConditions,
    IPolicyRule,
    PolicyAbility,
    PolicyAbilityRule,
    PolicyPlaceholderValues,
} from '@modules/policy/interfaces/policy.interface';
import { isPolicyPlaceholder } from '@modules/policy/constants/policy.constant';
import { Injectable } from '@nestjs/common';

/** Builds the typed Prisma CASL ability from persisted policies and a placeholder map. */
@Injectable()
export class PolicyAbilityFactory {
    private isPlainJsonObject(value: unknown): value is IPolicyConditions {
        return (
            value !== null && typeof value === 'object' && !Array.isArray(value)
        );
    }

    /** Resolves every placeholder in a condition value at any depth; `undefined` when one has no value. */
    private interpolateValue(
        value: Prisma.JsonValue,
        values: PolicyPlaceholderValues
    ): Prisma.JsonValue | undefined {
        if (Array.isArray(value)) {
            const items: Prisma.JsonArray = [];
            for (const item of value) {
                const resolved = this.interpolateValue(item, values);
                if (resolved === undefined) {
                    return undefined;
                }

                items.push(resolved);
            }

            return items;
        }

        if (this.isPlainJsonObject(value)) {
            return this.interpolate(value, values) ?? undefined;
        }

        return isPolicyPlaceholder(value) ? values[value] : value;
    }

    private interpolate(
        conditions: IPolicyConditions,
        values: PolicyPlaceholderValues
    ): IPolicyConditions | null {
        const entries: IPolicyConditions = {};

        for (const [key, value] of Object.entries(conditions)) {
            const resolved =
                value === undefined
                    ? undefined
                    : this.interpolateValue(value, values);
            if (resolved === undefined) {
                return null;
            }

            entries[key] = resolved;
        }

        return entries;
    }

    /**
     * Resolves one persisted policy into a plain ability rule. Placeholders resolve at any depth,
     * so a seeded relational condition (`members.some.userId`) keeps its user. An allow whose
     * placeholder has no value, or whose conditions are not a plain object, is omitted (`null`); an
     * inverted rule in that state becomes an unconditional deny on its subject and actions. Both
     * fail closed.
     */
    private toAbilityRule(
        policy: IPolicyRule,
        placeholders: PolicyPlaceholderValues
    ): PolicyAbilityRule | null {
        const { conditions } = policy;
        const base: PolicyAbilityRule = {
            subject: policy.subject,
            action: policy.action,
            inverted: policy.inverted,
            ...(policy.reason ? { reason: policy.reason } : {}),
        };
        if (conditions === null) {
            return base;
        }

        const resolved = this.isPlainJsonObject(conditions)
            ? this.interpolate(conditions, placeholders)
            : null;
        if (resolved !== null) {
            return { ...base, conditions: resolved };
        }

        return policy.inverted ? base : null;
    }

    /**
     * Builds the typed Prisma CASL ability from persisted policies. Placeholders resolve first
     * with a fail-closed drop; inverted rules are then added after allows so a matching deny is
     * authoritative.
     */
    build(
        policies: IPolicyRule[],
        placeholders: PolicyPlaceholderValues
    ): PolicyAbility {
        const rules = policies.flatMap(
            policy => this.toAbilityRule(policy, placeholders) ?? []
        );
        const orderedRules = [
            ...rules.filter(rule => !rule.inverted),
            ...rules.filter(rule => rule.inverted),
        ];

        return createPrismaAbility<PolicyAbility>(orderedRules);
    }
}
