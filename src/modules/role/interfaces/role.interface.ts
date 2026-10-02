import type { EnumRoleScope } from '@generated/prisma-client/client';
import type { Policy, Role } from '@generated/prisma-client/client';

export interface IRole {
    id: string;
    scope: EnumRoleScope;
    key: string;
    name: string;
}

export type IRoleWithPolicies = Role & {
    policies: Policy[];
};

export type IRoleWithPolicyCount = Role & {
    _count: { policies: number };
};

export interface IRoleUpdate {
    name: string;
    description?: string;
}
