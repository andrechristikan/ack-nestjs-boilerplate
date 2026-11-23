import type { Ability, RawRuleOf } from '@casl/ability';
import type {
    PrismaQueryOf,
    Subjects,
    WhereInputOf,
} from '@casl/prisma/runtime';
import type {
    EnumPolicyAction,
    EnumPolicySubject,
    EnumRoleScope,
    Policy,
    Prisma,
} from '@generated/prisma-client/client';
import type { EnumPolicyConditionPlaceholder } from '@modules/policy/enums/policy.enum';

export type IPolicyConditions = Prisma.JsonObject;

export type IPolicyPlaceholderValues = Readonly<
    Record<EnumPolicyConditionPlaceholder, string | null>
>;

export interface IPolicyRequired<
    TSubject extends EnumPolicySubject = EnumPolicySubject,
> {
    subject: TSubject;
    action: EnumPolicyAction[];
}

export interface IEffectivePermission<
    TSubject extends EnumPolicySubject = EnumPolicySubject,
> {
    subject: TSubject;
    actions: EnumPolicyAction[];
}

export interface IPolicyMissing {
    subject: EnumPolicySubject;
    actions: EnumPolicyAction[];
}

export interface IPolicyForbiddenOptions {
    missing: IPolicyMissing[];
    reason?: string;
}

export type IPolicyModelSubject = Extract<EnumPolicySubject, Prisma.ModelName>;

type PolicyRecordMap = {
    [TSubject in IPolicyModelSubject]: Partial<
        Prisma.TypeMap['model'][TSubject]['payload']['scalars']
    >;
} & {
    WorkspaceAnalytic: { workspaceId?: string };
};

type PolicyRecordAbilitySubject = Subjects<PolicyRecordMap>;

export type IPolicyWhereInput<TSubject extends IPolicyModelSubject> =
    WhereInputOf<Prisma.TypeMap, TSubject>;

export type IPolicyAbilitySubject<
    TSubject extends EnumPolicySubject = EnumPolicySubject,
> =
    | TSubject
    | Extract<
          PolicyRecordAbilitySubject,
          { readonly __caslSubjectType__: TSubject }
      >;

export type IPolicyAbility = Ability<
    [EnumPolicyAction, IPolicyAbilitySubject],
    PrismaQueryOf<Prisma.TypeMap>
>;

export type IPolicyAbilityRule = RawRuleOf<IPolicyAbility>;

export type IPolicyRule = Pick<
    Policy,
    'subject' | 'action' | 'conditions' | 'inverted' | 'reason'
>;

export type IPolicyRuleInput = Pick<
    IPolicyRule,
    'subject' | 'action' | 'conditions'
>;

export type IPolicyRoleScopeSubjectContract = Readonly<
    Record<EnumRoleScope, readonly EnumPolicySubject[]>
>;

export interface IPolicyRoleRevision {
    roleId: string;
    policyRevision: number;
}

export interface IPolicyContext {
    ability: IPolicyAbility;
}

export interface IPolicyCreate {
    subject: EnumPolicySubject;
    action: EnumPolicyAction[];
    conditions: IPolicyConditions | null;
    inverted: boolean;
    reason: string | null;
}

export type IPolicyUpdate = Omit<IPolicyCreate, 'subject'>;
