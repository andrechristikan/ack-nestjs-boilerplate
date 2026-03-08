import { ForcedSubject, PureAbility } from '@casl/ability';
import { PrismaQuery } from '@casl/prisma';
import {
    EnumPolicyAction,
    EnumPolicyEffect,
    EnumPolicyMatch,
    EnumPolicySubject,
} from '@modules/policy/enums/policy.enum';

export type PolicyAbility = PureAbility<
    [
        EnumPolicyAction,
        EnumPolicySubject | ForcedSubject<EnumPolicySubject>
    ],
    PrismaQuery
>;

/**
 * Internal type for building CASL abilities from stored data.
 * Used by the factory's `createForUser` to build the ability instance.
 *
 * `conditions` is typed as `PrismaQuery` (not `Record<string, unknown>`) because
 * abilities are always compiled with `createPrismaAbility`, which constrains
 * conditions to valid Prisma `where` clauses.
 */
export interface IPolicyAbilityInput {
    subject: EnumPolicySubject;
    action: EnumPolicyAction[];
    effect?: EnumPolicyEffect;
    fields?: string[];
    conditions?: PrismaQuery;
    reason?: string;
    priority?: number;
}

/**
 * Minimal type for decorator/requirement metadata.
 * Routes only need to declare what subject+action they require.
 */
export interface IPolicyRule {
    subject: EnumPolicySubject;
    action: EnumPolicyAction[];
    fields?: string[];
    conditions?: PrismaQuery;
}

export interface IPolicyRequirement {
    rules: IPolicyRule[];
    match?: EnumPolicyMatch;
}

export interface PolicyConditionContext {
    userId: string;
}
