import { EnumRoleType } from '@generated/prisma-client/client';
import type { Prisma } from '@generated/prisma-client/client';
import type {
    RoleSelect,
    RoleWithPoliciesInclude,
    RoleWithPolicyCountInclude,
    RoleWithUserIdInclude,
} from '@modules/role/constants/role.constant';

export type IRole = Prisma.RoleGetPayload<{
    select: typeof RoleSelect;
}>;

export type IRoleWithPolicies = Prisma.RoleGetPayload<{
    include: typeof RoleWithPoliciesInclude;
}>;

export type IRoleWithPolicyCount = Prisma.RoleGetPayload<{
    include: typeof RoleWithPolicyCountInclude;
}>;

export type IRoleDeletable = Prisma.RoleGetPayload<{
    include: typeof RoleWithUserIdInclude;
}>;

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
