import { Prisma } from '@generated/prisma-client/client';

/** @public */
export const NotificationPayloadEncryptionPurpose = 'notification.payload';

/** @public */
export const NotificationRefSelect = {
    id: true,
    isRead: true,
} satisfies Prisma.NotificationSelect;

/** @public */
export const NotificationTemplateLabelWordRegex = /[A-Z]/g;
