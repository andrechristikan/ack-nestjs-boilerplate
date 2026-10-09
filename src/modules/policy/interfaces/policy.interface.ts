import type { Ability, RawRuleOf } from '@casl/ability';
import type {
    PrismaQueryOf,
    Subjects,
    WhereInputOf,
} from '@casl/prisma/runtime';
import type {
    EnumPolicyAction,
    EnumPolicySubject,
    Policy,
    Prisma,
} from '@generated/prisma-client/client';
import type { EnumPolicyConditionPlaceholder } from '@modules/policy/constants/policy.constant';
export type { PolicySubject } from '@modules/policy/enums/policy.enum';

export type IPolicyConditions = Prisma.JsonObject;

export type PolicyPlaceholderValues = Readonly<
    Partial<Record<EnumPolicyConditionPlaceholder, string>>
>;

export interface IPolicyRequired<
    TSubject extends EnumPolicySubject = EnumPolicySubject,
> {
    subject: TSubject;
    action: EnumPolicyAction[];
}

/**
 * One row of the caller's effective permissions: a subject and the concrete actions the resolved
 * ability grants on it.
 * @public
 */
export interface IEffectivePermission<
    TSubject extends EnumPolicySubject = EnumPolicySubject,
> {
    subject: TSubject;
    actions: EnumPolicyAction[];
}

export type PolicyModelSubject = Extract<EnumPolicySubject, Prisma.ModelName>;

type PolicyModelRecordMap = {
    [TSubject in PolicyModelSubject]: Partial<
        Prisma.TypeMap['model'][TSubject]['payload']['scalars']
    >;
};

type PolicyModelAbilitySubject = Subjects<PolicyModelRecordMap>;

export type PolicyWhereInput<TSubject extends PolicyModelSubject> =
    WhereInputOf<Prisma.TypeMap, TSubject>;

export type PolicyAbilitySubject<
    TSubject extends EnumPolicySubject = EnumPolicySubject,
> =
    | TSubject
    | Extract<
          PolicyModelAbilitySubject,
          { readonly __caslSubjectType__: TSubject }
      >;

export type PolicyAbility = Ability<
    [EnumPolicyAction, PolicyAbilitySubject],
    PrismaQueryOf<Prisma.TypeMap>
>;

export type PolicyAbilityRule = RawRuleOf<PolicyAbility>;

/** The persisted policy fields that ability building reads; the shape the policy cache stores per role. */
export type IPolicyRule = Pick<
    Policy,
    'subject' | 'action' | 'conditions' | 'inverted' | 'reason'
>;

/** A policy rule tagged with the role that owns it, as the cache loads it. */
export type IPolicyRuleWithRole = IPolicyRule & Pick<Policy, 'roleId'>;
