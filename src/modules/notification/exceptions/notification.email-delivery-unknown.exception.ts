import { QueueException } from '@queues/exceptions/queue.exception';

/**
 * Raised when an email batch ends with recipients whose delivery outcome is unknown; they stay claimed and are never re-sent.
 * @public
 */
export class NotificationEmailDeliveryUnknownException extends QueueException {
    constructor(
        readonly message: string,
        readonly batchId: string,
        readonly unknownCount: number,
        readonly rawError: unknown = null
    ) {
        super(message, true, rawError);
    }
}
