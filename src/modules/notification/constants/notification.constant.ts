import { Prisma } from '@generated/prisma-client/client';

/** @public */
export const NotificationPayloadEncryptionPurpose = 'notification.payload';

/** @public */
export const NotificationReadStateSelect = {
    isRead: true,
} satisfies Prisma.NotificationSelect;

/** @public */
export const NotificationTermPolicyRecipientSendWhere = {
    sentAt: null,
    claimedAt: null,
} satisfies Prisma.TermPolicyRecipientWhereInput;

/** @public */
export const NotificationTermPolicyRecipientStateSelect = {
    userId: true,
    notificationId: true,
    batchId: true,
    sentAt: true,
    claimedAt: true,
} satisfies Prisma.TermPolicyRecipientSelect;

/** @public */
export const NotificationTermPolicyRecipientSendSelect = {
    userId: true,
} satisfies Prisma.TermPolicyRecipientSelect;
