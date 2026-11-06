import { QueueException } from '@queues/exceptions/queue.exception';

/** @public */
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
