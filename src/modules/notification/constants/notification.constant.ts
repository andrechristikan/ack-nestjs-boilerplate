import { Prisma } from '@generated/prisma-client/client';

/**
 * HKDF purpose that seals secrets inside queued notification jobs.
 * @public
 */
export const NotificationPayloadEncryptionPurpose = 'notification.payload';

/**
 * Job id pattern for a job keyed by process name and recipient user id.
 * @public
 */
export const NotificationUserJobIdPattern = '{process}-{userId}';

/**
 * Job id pattern for a job keyed by process name and invite reference.
 * @public
 */
export const NotificationReferenceJobIdPattern = '{process}-{reference}';

/**
 * Job id pattern for a job keyed by process name, workspace id and recipient user id.
 * @public
 */
export const NotificationWorkspaceUserJobIdPattern =
    '{process}-{workspaceId}-{userId}';

/**
 * Job id pattern for a job keyed by process name, term policy id and stored batch id.
 * @public
 */
export const NotificationTermPolicyBatchJobIdPattern =
    '{process}-{termPolicyId}-{batchId}';

/**
 * Job id pattern for a job keyed by process name and term policy id.
 * @public
 */
export const NotificationTermPolicyPublishJobIdPattern =
    '{process}-{termPolicyId}';

/**
 * Job id pattern for a job keyed by process name, recipient user id and term policy id.
 * @public
 */
export const NotificationUserTermPolicyJobIdPattern =
    '{process}-{userId}-{termPolicyId}';

/**
 * Job id pattern for a job keyed by notification id and the step it runs.
 * @public
 */
export const NotificationStepJobIdPattern = '{notificationId}-{step}';

/**
 * Prisma where of a recipient user that is not deleted.
 * @public
 */
export const NotificationUserNotDeletedWhere = {
    deletedAt: null,
} satisfies Prisma.UserWhereInput;

/**
 * Prisma where of a term policy recipient row not yet emailed whose user is not deleted.
 * Spread with the term policy id and batch id.
 * @public
 */
export const NotificationTermPolicyRecipientSendWhere = {
    sentAt: null,
    user: { is: NotificationUserNotDeletedWhere },
} satisfies Prisma.TermPolicyRecipientWhereInput;

/**
 * Columns a term policy recipient state read returns.
 * @public
 */
export const NotificationTermPolicyRecipientStateSelect = {
    userId: true,
    batchId: true,
    enqueuedAt: true,
} satisfies Prisma.TermPolicyRecipientSelect;

/**
 * Columns a term policy email send reads from a recipient row and its user.
 * @public
 */
export const NotificationTermPolicyRecipientSendSelect = {
    userId: true,
    notificationId: true,
    user: { select: { email: true, username: true } },
} satisfies Prisma.TermPolicyRecipientSelect;
