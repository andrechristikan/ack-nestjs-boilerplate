import type { Ability, ForcedSubject, RawRuleOf } from '@casl/ability';
import type { PrismaQuery } from '@casl/prisma';
import type {
    EnumPolicyAction,
    EnumPolicySubject,
    Prisma,
} from '@generated/prisma-client/client';
import type { EnumPolicyConditionPlaceholder } from '@modules/policy/constants/policy.constant';

export type IPolicyConditions = Prisma.JsonObject;

export type IPolicyPlaceholderValues = Readonly<
    Partial<Record<EnumPolicyConditionPlaceholder, string | undefined>>
>;

export interface IPolicyRequired {
    subject: EnumPolicySubject;
    action: EnumPolicyAction[];
}

export type IPolicyAbilitySubject =
    EnumPolicySubject | ForcedSubject<EnumPolicySubject>;

export type IPolicyAbility = Ability<
    [EnumPolicyAction, IPolicyAbilitySubject],
    PrismaQuery
>;

export type IPolicyAbilityRule = RawRuleOf<IPolicyAbility>;
