import type { Prisma } from '@generated/prisma-client/client';

/** @public */
export const DeviceFingerprintRegex = /^[A-Za-z0-9._:-]+$/;

/** @public */
export const DeviceOwnershipRefSelect = {
    id: true,
    userId: true,
    deviceId: true,
    isRevoked: true,
    notificationToken: true,
} satisfies Prisma.DeviceOwnershipSelect;
