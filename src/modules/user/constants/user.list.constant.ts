import { EnumUserStatus, Prisma } from '@generated/prisma-client/client';

/** @public */
export const UserDefaultAvailableSearch = [
    Prisma.UserScalarFieldEnum.name,
    Prisma.UserScalarFieldEnum.username,
    Prisma.UserScalarFieldEnum.email,
] as const satisfies ReadonlyArray<Prisma.UserScalarFieldEnum>;

/** @public */
export const UserDefaultAvailableOrderBy = [
    Prisma.UserScalarFieldEnum.createdAt,
    Prisma.UserScalarFieldEnum.name,
] as const satisfies ReadonlyArray<Prisma.UserScalarFieldEnum>;

/** @public */
export const UserDefaultStatus = Object.values(EnumUserStatus);
