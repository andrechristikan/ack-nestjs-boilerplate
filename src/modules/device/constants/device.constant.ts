import type { Prisma } from '@generated/prisma-client/client';

/**
 * Characters and length a device fingerprint accepts.
 * @public
 */
export const DeviceFingerprintRegex = /^[A-Za-z0-9._:-]{8,128}$/;

/**
 * Column a push-token read of a device ownership returns.
 * @public
 */
export const DeviceOwnershipNotificationTokenSelect = {
    notificationToken: true,
} satisfies Prisma.DeviceOwnershipSelect;
