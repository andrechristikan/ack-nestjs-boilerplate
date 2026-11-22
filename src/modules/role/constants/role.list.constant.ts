import { EnumRoleType, Prisma } from '@generated/prisma-client/client';

/** @public */
export const RoleDefaultAvailableSearch = [
    Prisma.RoleScalarFieldEnum.name,
] as const satisfies ReadonlyArray<Prisma.RoleScalarFieldEnum>;

/** @public */
export const RoleDefaultAvailableOrderBy = [
    Prisma.RoleScalarFieldEnum.createdAt,
    Prisma.RoleScalarFieldEnum.name,
] as const satisfies ReadonlyArray<Prisma.RoleScalarFieldEnum>;

/** @public */
export const RoleDefaultType = Object.values(EnumRoleType);

/** @public */
export const RoleSystemListCursorScope = 'RoleSystemListCursorScope';
