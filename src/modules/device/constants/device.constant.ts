import type { Prisma } from '@generated/prisma-client/client';

/** @public */
export const DeviceFingerprintRegex = /^[A-Za-z0-9._:-]{8,128}$/;

/** @public */
export const DeviceOwnershipNotificationTokenSelect = {
    notificationToken: true,
} satisfies Prisma.DeviceOwnershipSelect;

/** @public */
export const DeviceOwnershipRevokedSelect = {
    isRevoked: true,
} satisfies Prisma.DeviceOwnershipSelect;

/** @public */
export const DeviceOwnershipDeviceIdSelect = {
    deviceId: true,
} satisfies Prisma.DeviceOwnershipSelect;

/** @public */
export const DeviceOwnershipSessionIdSelect = {
    id: true,
} satisfies Prisma.SessionSelect;
