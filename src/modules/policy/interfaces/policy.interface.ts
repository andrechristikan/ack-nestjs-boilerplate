import { PureAbility } from '@casl/ability';
import { PrismaQuery, WhereInput } from '@casl/prisma';
import {
    EnumPolicyAction,
    EnumPolicyEffect,
    EnumPolicyMatch,
    EnumPolicySubject,
} from '@modules/policy/enums/policy.enum';
import { Prisma } from '@prisma/client';

export type IPolicyAbilitySubject = EnumPolicySubject | 'all';

/**
 * All policy subjects except `all`, which has no corresponding Prisma model.
 * Used to constrain `getAccessibleWhere` at compile time.
 */
export type PolicySubject = Exclude<EnumPolicySubject, EnumPolicySubject.all>;

/**
 * Maps a policy subject to its Prisma `WhereInput` type.
 * Relies on the convention that `EnumPolicySubject` values are the camelCase
 * form of their Prisma model name (e.g. `activityLog` → `ActivityLog`).
 */
export type PolicyWhereInput<S extends PolicySubject> =
    Capitalize<S> extends Prisma.ModelName ? WhereInput<Capitalize<S>> : never;

export type IPolicyAbilityRule = PureAbility<
    [EnumPolicyAction, IPolicyAbilitySubject],
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
    conditions?: Record<string, unknown>;
}

export interface IPolicyRequirement {
    rules: IPolicyRule[];
    match?: EnumPolicyMatch;
}

export interface PolicyConditionContext {
    userId: string;
}
