import { createPrismaAbility } from '@casl/prisma/runtime';
import { Injectable } from '@nestjs/common';
import type { Prisma } from '@generated/prisma-client/client';
import type { EnumPolicyConditionPlaceholder } from '@modules/policy/enums/policy.enum';
import type {
    IPolicyAbility,
    IPolicyAbilityRule,
    IPolicyConditions,
    IPolicyPlaceholderValues,
    IPolicyRule,
} from '@modules/policy/interfaces/policy.interface';

@Injectable()
export class PolicyAbilityFactory {
    private readonly placeholderPattern = /^\$\{[^}]+\}$/;

    private isPolicyPlaceholder(
        value: unknown
    ): value is EnumPolicyConditionPlaceholder {
        if (typeof value !== 'string') {
            return false;
        }

        return this.placeholderPattern.test(value);
    }

    private isPlainJsonObject(value: unknown): value is IPolicyConditions {
        return (
            value !== null && typeof value === 'object' && !Array.isArray(value)
        );
    }

    private interpolateValue(
        value: Prisma.JsonValue,
        values: IPolicyPlaceholderValues
    ): Prisma.JsonValue | null {
        if (Array.isArray(value)) {
            const items: Prisma.JsonArray = [];
            for (const item of value) {
                const resolved = this.interpolateValue(item, values);
                if (resolved === null && item !== null) {
                    return null;
                }

                items.push(resolved);
            }

            return items;
        }

        const isObject = this.isPlainJsonObject(value);
        if (isObject) {
            return this.interpolate(value, values);
        }

        const isPlaceholder = this.isPolicyPlaceholder(value);
        if (isPlaceholder) {
            return Object.hasOwn(values, value) ? values[value] : null;
        }

        return value;
    }

    private interpolate(
        conditions: IPolicyConditions,
        values: IPolicyPlaceholderValues
    ): IPolicyConditions | null {
        const entries: IPolicyConditions = {};

        const pairs = Object.entries(conditions) as [
            string,
            Prisma.JsonValue,
        ][];
        for (const [key, value] of pairs) {
            const resolved = this.interpolateValue(value, values);
            if (resolved === null && value !== null) {
                return null;
            }

            entries[key] = resolved;
        }

        return entries;
    }

    private toAbilityRule(
        policy: IPolicyRule,
        placeholders: IPolicyPlaceholderValues
    ): IPolicyAbilityRule | null {
        const { conditions } = policy;
        const base: IPolicyAbilityRule = {
            subject: policy.subject,
            action: policy.action,
            inverted: policy.inverted,
            ...(policy.reason !== null && policy.reason !== ''
                ? { reason: policy.reason }
                : {}),
        };
        if (conditions === null) {
            return base;
        }

        const isObject = this.isPlainJsonObject(conditions);
        let resolved: IPolicyConditions | null = null;
        if (isObject) {
            resolved = this.interpolate(conditions, placeholders);
        }

        if (resolved !== null) {
            return { ...base, conditions: resolved };
        }

        return policy.inverted ? base : null;
    }

    build(
        policies: IPolicyRule[],
        placeholders: IPolicyPlaceholderValues
    ): IPolicyAbility {
        const rules: IPolicyAbilityRule[] = [];
        for (const policy of policies) {
            const rule = this.toAbilityRule(policy, placeholders);
            if (rule !== null) {
                rules.push(rule);
            }
        }

        return createPrismaAbility<IPolicyAbility>(rules);
    }
}
