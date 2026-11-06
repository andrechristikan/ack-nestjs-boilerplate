import { Prisma } from '@generated/prisma-client/client';

/** @public */
export const DeviceDefaultAvailableOrderBy = [
    Prisma.DeviceOwnershipScalarFieldEnum.createdAt,
    Prisma.DeviceOwnershipScalarFieldEnum.lastActiveAt,
] as const satisfies ReadonlyArray<Prisma.DeviceOwnershipScalarFieldEnum>;

/** @public */
export const DeviceCursorAvailableOrderBy = [
    Prisma.DeviceOwnershipScalarFieldEnum.createdAt,
] as const satisfies ReadonlyArray<Prisma.DeviceOwnershipScalarFieldEnum>;

/** @public */
export const DeviceSharedListCursorScope = 'DeviceSharedListCursorScope';
