import { EnumRoleType } from '@generated/prisma-client/client';
import type { Policy, Role } from '@generated/prisma-client/client';

export interface IRole {
    id: string;
    type: EnumRoleType;
    name: string;
    isImmutable: boolean;
}

export type IRoleWithPolicies = Role & {
    policies: Policy[];
};

export type IRoleWithPolicyCount = Role & {
    _count: { policies: number };
};

export type IRoleRank = Record<EnumRoleType, number>;

export interface IRoleActor {
    roleId: string;
    roleType: EnumRoleType;
}

export interface IRoleUpdate {
    description: string | null;
    type: EnumRoleType;
}

export interface IRoleCreate extends IRoleUpdate {
    name: Lowercase<string>;
}

export type IRoleWithPoliciesField = Extract<keyof IRoleWithPolicies, string>;

export type IRoleWithPoliciesFieldValue = NonNullable<
    IRoleWithPolicies[IRoleWithPoliciesField]
>;
