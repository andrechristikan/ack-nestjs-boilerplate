import { EnumRoleType } from '@generated/prisma-client/client';

/**
 * Fields the role lists search.
 * @public
 */
export const RoleDefaultAvailableSearch = ['name'];

/**
 * Sort fields the admin offset and system cursor role lists accept. `name` is set once at
 * creation and no update path writes it, so it is stable enough to order a cursor scroll by.
 * @public
 */
export const RoleDefaultAvailableOrderBy = ['createdAt', 'name'];

/**
 * Role types the role list filter accepts.
 * @public
 */
export const RoleDefaultType = Object.values(EnumRoleType);
