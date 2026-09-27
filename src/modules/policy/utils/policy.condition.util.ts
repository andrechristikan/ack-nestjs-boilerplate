import {
    EnumPolicyAction,
    EnumPolicySubject,
} from '@generated/prisma-client/client';
import type { Prisma } from '@generated/prisma-client/client';
import { PolicySubjectRegistry } from '@modules/policy/constants/policy.constant';
import type {
    IPolicyConditions,
    IPolicyPlaceholderContext,
    IPolicyResolved,
    IPolicyScopePair,
} from '@modules/policy/interfaces/policy.interface';

/** True when `value` is a non-null, non-array object. */
export function isPlainJsonObject(value: unknown): value is IPolicyConditions {
    return value !== null && typeof value === 'object' && !Array.isArray(value);
}

/** Sentinel returned by the placeholder resolver when a placeholder has no value in the context. */
export const PolicyConditionUnresolved = Symbol('unresolved');

/** Resolves a stored condition placeholder to a value from the request context, or `null` when the context carries none. */
const PolicyConditionPlaceholderResolvers: Record<
    string,
    (context: IPolicyPlaceholderContext) => string | null
> = {
    '${user.id}': context => context.user?.id ?? null,
    '${user.roleId}': context => context.user?.roleId ?? null,
    '${user.role.key}': context => context.user?.role.key ?? null,
    '${workspace.id}': context => context.workspace?.id ?? null,
    '${workspaceMember.id}': context => context.workspaceMember?.id ?? null,
    '${workspaceMember.roleId}': context =>
        context.workspaceMember?.roleId ?? null,
    '${workspaceMember.role.key}': context =>
        context.workspaceMember?.role.key ?? null,
    '${project.id}': context => context.project?.id ?? null,
    '${projectMember.id}': context => context.projectMember?.id ?? null,
    '${projectMember.roleId}': context => context.projectMember?.roleId ?? null,
    '${projectMember.role.key}': context =>
        context.projectMember?.role.key ?? null,
    '${request.language}': context => context.language,
};

function resolveNode(
    node: Prisma.JsonValue,
    context: IPolicyPlaceholderContext
): IPolicyResolved {
    if (typeof node === 'string') {
        if (!Object.hasOwn(PolicyConditionPlaceholderResolvers, node)) {
            return node;
        }

        return (
            PolicyConditionPlaceholderResolvers[node](context) ??
            PolicyConditionUnresolved
        );
    }

    if (node === null || typeof node !== 'object') {
        return node;
    }

    if (Array.isArray(node)) {
        const items: Prisma.JsonValue[] = [];
        for (const item of node) {
            const resolved = resolveNode(item, context);
            if (resolved === PolicyConditionUnresolved) {
                return PolicyConditionUnresolved;
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
        if (resolved === PolicyConditionUnresolved) {
            return PolicyConditionUnresolved;
        }

        entries[key] = resolved;
    }

    return entries;
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
 * The scope pair a stored rule of the subject must carry, read straight from the registry: the
 * subject's own scope, waived for a bare project `create` where no project exists yet.
 */
export function scopePairOf(
    subject: EnumPolicySubject,
    action: readonly EnumPolicyAction[]
): IPolicyScopePair | null {
    const isBareProjectCreate =
        subject === EnumPolicySubject.project &&
        action.length === 1 &&
        action[0] === EnumPolicyAction.create;

    return isBareProjectCreate ? null : PolicySubjectRegistry[subject].scope;
}

/**
 * Builds the stored condition tying a rule to the active workspace or project: the subject's
 * scope pair, followed by `extra`.
 */
export function scopedCondition(
    subject: EnumPolicySubject,
    action: readonly EnumPolicyAction[],
    extra: IPolicyConditions | null = null
): IPolicyConditions | null {
    const pair = scopePairOf(subject, action);
    if (pair === null) {
        return extra;
    }

    return { [pair.key]: pair.placeholder, ...extra };
}

/** True when the scope pair sits at the top level of the conditions or inside a top-level `AND` branch. */
export function hasScopePair(
    conditions: IPolicyConditions | null,
    pair: IPolicyScopePair
): boolean {
    if (conditions === null) {
        return false;
    }

    if (conditions[pair.key] === pair.placeholder) {
        return true;
    }

    const branches = conditions.AND;
    if (!Array.isArray(branches)) {
        return false;
    }

    return branches.some(
        branch =>
            isPlainJsonObject(branch) && branch[pair.key] === pair.placeholder
    );
}
