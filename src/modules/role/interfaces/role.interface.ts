import { EnumRoleType, Policy, Role } from '@generated/prisma-client';

export interface IRole {
    id: string;
    type: EnumRoleType;
    name: string;
}

export type IRoleWithPolicies = Role & {
    policies: Policy[];
};

export type IRoleWithPolicyCount = Role & {
    _count: { policies: number };
};

export interface IRoleUpdate {
    description?: string;
    type: EnumRoleType;
}

export interface IRoleCreate extends IRoleUpdate {
    name: Lowercase<string>;
}
