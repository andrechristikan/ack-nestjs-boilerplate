import { EnumRoleType } from '@generated/prisma-client';

export const RoleDefaultAvailableSearch = ['name'];

/**
 * Shared by the offset and the cursor role list. `name` is set once at creation and no
 * update path writes it, so it is stable enough to order a cursor scroll by.
 */
export const RoleDefaultAvailableOrderBy = ['createdAt', 'name'];

export const RoleDefaultType = Object.values(EnumRoleType);
