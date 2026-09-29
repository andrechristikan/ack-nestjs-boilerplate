import type { Prisma } from '@generated/prisma-client/client';
import { EnumPolicyConditionPlaceholder } from '@modules/policy/constants/policy.constant';
import type {
    IPolicyConditions,
    IPolicyPlaceholderValues,
} from '@modules/policy/interfaces/policy.interface';

/** True when `value` is a non-null, non-array object. */
export function isPlainJsonObject(value: unknown): value is IPolicyConditions {
    return value !== null && typeof value === 'object' && !Array.isArray(value);
}

function interpolateNode(
    node: Prisma.JsonValue,
    values: IPolicyPlaceholderValues
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
            const interpolated = interpolateNode(item, values);
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

        const interpolated = interpolateNode(child, values);
        if (interpolated === undefined) {
            return undefined;
        }

        entries[key] = interpolated;
    }

    return entries;
}

/** Interpolates known placeholders without mutating the conditions, failing closed when absent. */
export function interpolate(
    conditions: IPolicyConditions,
    values: IPolicyPlaceholderValues
): IPolicyConditions | null {
    const interpolated = interpolateNode(conditions, values);
    if (!isPlainJsonObject(interpolated)) {
        return null;
    }

    return interpolated;
}
