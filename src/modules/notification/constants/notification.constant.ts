import { Prisma } from '@generated/prisma-client/client';

/**
 * HKDF purpose that seals secrets inside queued notification jobs.
 * @public
 */
export const NotificationPayloadEncryptionPurpose = 'notification.payload';

/**
 * Prisma where of a term policy recipient row neither emailed nor claimed.
 * Spread with the term policy id and a batch id filter.
 * @public
 */
export const NotificationTermPolicyRecipientSendWhere = {
    sentAt: null,
    claimedAt: null,
} satisfies Prisma.TermPolicyRecipientWhereInput;

/**
 * Columns a term policy recipient state read returns.
 * @public
 */
export const NotificationTermPolicyRecipientStateSelect = {
    userId: true,
    notificationId: true,
    batchId: true,
    sentAt: true,
    claimedAt: true,
} satisfies Prisma.TermPolicyRecipientSelect;

/**
 * Columns a term policy email send reads from a recipient row.
 * @public
 */
export const NotificationTermPolicyRecipientSendSelect = {
    userId: true,
} satisfies Prisma.TermPolicyRecipientSelect;
