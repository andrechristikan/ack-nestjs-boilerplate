import { createPrismaAbility } from '@casl/prisma';
import type { Policy, Prisma } from '@generated/prisma-client/client';
import { EnumPolicyConditionPlaceholder } from '@modules/policy/constants/policy.constant';
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

    private interpolateNode(
        node: Prisma.JsonValue,
        values: PolicyPlaceholderValues
    ): Prisma.JsonValue | undefined {
        if (typeof node === 'string') {
            const isKnownPlaceholder = Object.values(
                EnumPolicyConditionPlaceholder
            ).includes(node as EnumPolicyConditionPlaceholder);
            if (!isKnownPlaceholder && !Object.hasOwn(values, node)) {
                return node;
            }

            return values[node as EnumPolicyConditionPlaceholder];
        }

        if (node === null || typeof node !== 'object') {
            return node;
        }

        if (Array.isArray(node)) {
            const items: Prisma.JsonValue[] = [];
            for (const item of node) {
                const interpolated = this.interpolateNode(item, values);
                if (interpolated === undefined) {
                    return undefined;
                }

                items.push(interpolated);
            }

            return items;
        }

        const entries: IPolicyConditions = {};
        for (const [key, child] of Object.entries(node)) {
            if (child === undefined) {
                continue;
            }

            const interpolated = this.interpolateNode(child, values);
            if (interpolated === undefined) {
                return undefined;
            }

            entries[key] = interpolated;
        }

        return entries;
    }

    private interpolate(
        conditions: IPolicyConditions,
        values: PolicyPlaceholderValues
    ): IPolicyConditions | null {
        const interpolated = this.interpolateNode(conditions, values);
        if (!this.isPlainJsonObject(interpolated)) {
            return null;
        }

        return interpolated;
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
