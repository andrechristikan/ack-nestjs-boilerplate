import { Prisma } from '@generated/prisma-client/client';

/**
 * Sort fields the admin offset device list accepts.
 * @public
 */
export const DeviceDefaultAvailableOrderBy = [
    Prisma.DeviceOwnershipScalarFieldEnum.createdAt,
    Prisma.DeviceOwnershipScalarFieldEnum.lastActiveAt,
] as const satisfies ReadonlyArray<Prisma.DeviceOwnershipScalarFieldEnum>;

/**
 * Sort fields the shared cursor device list accepts.
 * @public
 */
export const DeviceCursorAvailableOrderBy = [
    Prisma.DeviceOwnershipScalarFieldEnum.createdAt,
] as const satisfies ReadonlyArray<Prisma.DeviceOwnershipScalarFieldEnum>;
