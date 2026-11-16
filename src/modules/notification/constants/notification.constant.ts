import { Prisma } from '@generated/prisma-client/client';

/** @public */
export const NotificationPayloadEncryptionPurpose = 'notification.payload';

/** @public */
export const NotificationReadStateSelect = {
    isRead: true,
} satisfies Prisma.NotificationSelect;
