import {
    EnumPolicyAction,
    EnumPolicySubject,
} from '@generated/prisma-client/client';
import type { Prisma } from '@generated/prisma-client/client';
import {
    PolicySubjectScope,
    type PolicySubjectScopeEntry,
} from '@modules/policy/constants/policy.constant';
import type {
    IPolicyConditions,
    IPolicyPlaceholderContext,
    IPolicyPlaceholderValues,
} from '@modules/policy/interfaces/policy.interface';

/** True when `value` is a non-null, non-array object. */
export function isPlainJsonObject(value: unknown): value is IPolicyConditions {
    return value !== null && typeof value === 'object' && !Array.isArray(value);
}

/** Resolves a stored condition placeholder to a value from the request context, or `null` when the context carries none. */
const PolicyConditionPlaceholderResolvers: Record<
    string,
    (context: IPolicyPlaceholderContext) => string | undefined
> = {
    '${user.id}': context => context.user?.id,
    '${workspace.id}': context => context.workspace?.id,
    '${workspaceMember.id}': context => context.workspaceMember?.id,
    '${project.id}': context => context.project?.id,
    '${projectMember.id}': context => context.projectMember?.id,
};

function resolveNode(
    node: Prisma.JsonValue,
    context: IPolicyPlaceholderContext
): Prisma.JsonValue | undefined {
    if (typeof node === 'string') {
        if (!Object.hasOwn(PolicyConditionPlaceholderResolvers, node)) {
            return node;
        }

        return PolicyConditionPlaceholderResolvers[node](context);
    }

    if (node === null || typeof node !== 'object') {
        return node;
    }

    if (Array.isArray(node)) {
        const items: Prisma.JsonValue[] = [];
        for (const item of node) {
            const resolved = resolveNode(item, context);
            if (resolved === undefined) {
                return undefined;
            }

            items.push(resolved);
        }

        return items;
    }

    const entries: IPolicyConditions = {};
    for (const [key, child] of Object.entries(node)) {
        if (child === undefined) {
            continue;
        }

        const resolved = resolveNode(child, context);
        if (resolved === undefined) {
            return undefined;
        }

        entries[key] = resolved;
    }

    return entries;
}

function interpolateNode(
    node: Prisma.JsonValue,
    values: IPolicyPlaceholderValues
): Prisma.JsonValue | undefined {
    if (typeof node === 'string') {
        if (!Object.hasOwn(values, node)) {
            return node;
        }

        return values[node];
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

/** Interpolates only the explicitly supplied placeholders without mutating the conditions. */
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

/** Returns `null` when a placeholder has no value in the context, so the caller can fail closed. */
export function resolvePlaceholders(
    conditions: IPolicyConditions,
    context: IPolicyPlaceholderContext
): IPolicyConditions | null {
    const resolved = resolveNode(conditions, context);
    if (!isPlainJsonObject(resolved)) {
        return null;
    }

    return resolved;
}

/**
 * The scope a stored rule must carry, waived for a project `create` where no project exists yet.
 */
export function policyScopeOf(
    subject: EnumPolicySubject,
    action: readonly EnumPolicyAction[]
): PolicySubjectScopeEntry | null {
    // A project-create policy runs before a project exists, so it cannot be
    // constrained by the project ID that later project operations require.
    const isPreResourceProjectCreate =
        subject === EnumPolicySubject.Project &&
        action.length === 1 &&
        action[0] === EnumPolicyAction.create;

    return isPreResourceProjectCreate
        ? null
        : (PolicySubjectScope[subject as keyof typeof PolicySubjectScope] ??
              null);
}

/**
 * Builds the stored condition tying a rule to the active workspace or project, followed by `extra`.
 */
export function scopedCondition(
    subject: EnumPolicySubject,
    action: readonly EnumPolicyAction[],
    extra: IPolicyConditions | null = null
): IPolicyConditions | null {
    const requiredScope = policyScopeOf(subject, action);
    if (requiredScope === null) {
        return extra;
    }

    const { [requiredScope.key]: _ignoredScope, ...otherConditions } =
        extra ?? {};

    return {
        [requiredScope.key]: requiredScope.placeholder,
        ...otherConditions,
    };
}
