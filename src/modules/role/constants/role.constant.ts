import type { Prisma } from '@generated/prisma-client/client';
import { EnumRolePlatformKey } from '@modules/role/enums/role.enum';
import type { IRoleRank } from '@modules/role/interfaces/role.interface';

/** @public */
export const RoleSelect = {
    id: true,
    scope: true,
    key: true,
    name: true,
    description: true,
    policyRevision: true,
    isImmutable: true,
} satisfies Prisma.RoleSelect;

/** @public */
export const RoleRefSelect = {
    id: true,
    scope: true,
    key: true,
    name: true,
    policyRevision: true,
} satisfies Prisma.RoleSelect;

/** @public */
export const RoleWithPoliciesInclude = {
    policies: true,
} satisfies Prisma.RoleInclude;

/** @public */
export const RoleWithPolicyCountInclude = {
    _count: { select: { policies: true } },
} satisfies Prisma.RoleInclude;

/** @public */
export const RoleRank: IRoleRank = {
    [EnumRolePlatformKey.superAdmin]: 3,
    [EnumRolePlatformKey.admin]: 2,
    [EnumRolePlatformKey.user]: 1,
};

/** @public */
export const RoleCustomPlatformRank = RoleRank[EnumRolePlatformKey.user];
