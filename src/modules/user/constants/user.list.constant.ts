import { EnumUserStatus } from '@generated/prisma-client/client';

/**
 * Fields the admin user list searches.
 * @public
 */
export const UserDefaultAvailableSearch = ['name', 'username', 'email'];

/**
 * Sort fields the admin user list accepts.
 * @public
 */
export const UserDefaultAvailableOrderBy = ['createdAt', 'name'];

/**
 * User statuses the admin user list filter accepts.
 * @public
 */
export const UserDefaultStatus = Object.values(EnumUserStatus);
