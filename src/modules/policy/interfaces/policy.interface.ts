import type { Ability, ForcedSubject, RawRuleOf } from '@casl/ability';
import type { PrismaQuery } from '@casl/prisma';
import type {
    EnumPolicyAction,
    EnumPolicySubject,
    Prisma,
} from '@generated/prisma-client/client';
export type { PolicySubject } from '@modules/policy/enums/policy.enum';

export type IPolicyConditions = Prisma.JsonObject;

export type PolicyPlaceholderValues = Readonly<
    Record<string, string | undefined>
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
export interface IEffectivePermission {
    subject: EnumPolicySubject;
    actions: EnumPolicyAction[];
}

export type PolicyAbilitySubject =
    EnumPolicySubject | ForcedSubject<EnumPolicySubject>;

export type PolicyAbility = Ability<
    [EnumPolicyAction, PolicyAbilitySubject],
    PrismaQuery
>;

export type PolicyAbilityRule = RawRuleOf<PolicyAbility>;

/** Request context used to resolve all roles applicable to one ability. */
export interface IPolicyAbilityBuildInput {
    user: { id: string; roleId: string };
    workspace?: { id: string; memberRoleId: string };
    project?: { id: string; memberRoleId: string | null };
}
