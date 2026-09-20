import { EnumUserStatus, Prisma } from '@generated/prisma-client/client';

/**
 * Fields the admin user list searches.
 * @public
 */
export const UserDefaultAvailableSearch = [
    Prisma.UserScalarFieldEnum.name,
    Prisma.UserScalarFieldEnum.username,
    Prisma.UserScalarFieldEnum.email,
] as const satisfies ReadonlyArray<Prisma.UserScalarFieldEnum>;

/**
 * Sort fields the admin user list accepts.
 * @public
 */
export const UserDefaultAvailableOrderBy = [
    Prisma.UserScalarFieldEnum.createdAt,
    Prisma.UserScalarFieldEnum.name,
] as const satisfies ReadonlyArray<Prisma.UserScalarFieldEnum>;

/**
 * User statuses the admin user list filter accepts.
 * @public
 */
export const UserDefaultStatus = Object.values(EnumUserStatus);
