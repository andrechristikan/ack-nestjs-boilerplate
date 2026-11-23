import type {
    EnumRoleScope,
    Prisma,
    Role,
} from '@generated/prisma-client/client';
import type {
    RoleSelect,
    RoleWithPoliciesInclude,
    RoleWithPolicyCountInclude,
} from '@modules/role/constants/role.constant';
import type { EnumRolePlatformKey } from '@modules/role/enums/role.enum';

export type IRole = Prisma.RoleGetPayload<{
    select: typeof RoleSelect;
}>;

export type IRoleRef = Pick<
    Role,
    'id' | 'scope' | 'key' | 'name' | 'policyRevision'
>;

export type IRoleScopeKey = Pick<IRoleRef, 'scope' | 'key'>;

export type IRoleWithPolicies = Prisma.RoleGetPayload<{
    include: typeof RoleWithPoliciesInclude;
}>;

export type IRoleWithPolicyCount = Prisma.RoleGetPayload<{
    include: typeof RoleWithPolicyCountInclude;
}>;

export type IRoleRank = Record<EnumRolePlatformKey, number>;

export interface IRoleActor {
    roleId: string;
    roleKey: string;
}

export interface IRoleUpdate {
    name: string;
    description: string | null;
}

export interface IRoleCreate extends IRoleUpdate {
    scope: EnumRoleScope;
    key: string;
}
