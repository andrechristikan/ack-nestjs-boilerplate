import { EnumRoleScope, Prisma } from '@generated/prisma-client/client';

/** @public */
export const RoleDefaultAvailableSearch = [
    Prisma.RoleScalarFieldEnum.name,
    Prisma.RoleScalarFieldEnum.key,
] as const satisfies ReadonlyArray<Prisma.RoleScalarFieldEnum>;

/** @public */
export const RoleDefaultAvailableOrderBy = [
    Prisma.RoleScalarFieldEnum.createdAt,
    Prisma.RoleScalarFieldEnum.name,
] as const satisfies ReadonlyArray<Prisma.RoleScalarFieldEnum>;

/** @public */
export const RoleCursorAvailableOrderBy = [
    Prisma.RoleScalarFieldEnum.createdAt,
] as const satisfies ReadonlyArray<Prisma.RoleScalarFieldEnum>;

/** @public */
export const RoleDefaultScope = Object.values(EnumRoleScope);

/** @public */
export const RoleSharedScope = [
    EnumRoleScope.workspace,
    EnumRoleScope.project,
] as const;

/** @public */
export const RoleSharedListCursorScope = 'RoleSharedListCursorScope';

/** @public */
export const RoleSystemListCursorScope = 'RoleSystemListCursorScope';
