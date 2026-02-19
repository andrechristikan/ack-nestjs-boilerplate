import { InferSubjects, MongoAbility } from '@casl/ability';
import {
    EnumPolicyAction,
    EnumPolicyEffect,
    EnumPolicyMatch,
    EnumPolicySubject,
} from '@modules/policy/enums/policy.enum';
import { IRequestApp } from '@common/request/interfaces/request.interface';

export type IPolicyAbilitySubject = InferSubjects<EnumPolicySubject> | 'all';

export type IPolicyAbilityRule = MongoAbility<
    [EnumPolicyAction, IPolicyAbilitySubject]
>;

/**
 * Internal type for building CASL abilities from stored data.
 * Used by the factory's `createForUser` to build the ability instance.
 */
export interface IPolicyAbilityInput {
    subject: EnumPolicySubject;
    action: EnumPolicyAction[];
    effect?: EnumPolicyEffect;
    fields?: string[];
    conditions?: Record<string, unknown>;
    description?: string;
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

export type PolicySubjectResolver = (
    request: IRequestApp
) => Record<string, unknown> | undefined | null;

export interface IPolicyRequirement {
    rules: IPolicyRule[];
    match?: EnumPolicyMatch;
    resource?: Record<string, unknown> | PolicySubjectResolver;
}
