import { EnumRoleScope, Prisma } from '@generated/prisma-client/client';

/**
 * Fields the role lists search.
 * @public
 */
export const RoleDefaultAvailableSearch = [
    Prisma.RoleScalarFieldEnum.name,
] as const satisfies ReadonlyArray<Prisma.RoleScalarFieldEnum>;

/**
 * Sort fields the admin offset role list accepts.
 * @public
 */
export const RoleDefaultAvailableOrderBy = [
    Prisma.RoleScalarFieldEnum.createdAt,
    Prisma.RoleScalarFieldEnum.name,
] as const satisfies ReadonlyArray<Prisma.RoleScalarFieldEnum>;

/**
 * Sort fields the cursor role lists accept. `name` is editable, so only the immutable
 * `createdAt` is stable enough to order a cursor scroll by.
 * @public
 */
export const RoleCursorAvailableOrderBy = [
    Prisma.RoleScalarFieldEnum.createdAt,
] as const satisfies ReadonlyArray<Prisma.RoleScalarFieldEnum>;

/**
 * Role scopes the role list filter accepts.
 * @public
 */
export const RoleDefaultScope = Object.values(EnumRoleScope);
