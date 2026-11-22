import { QueueException } from '@common/queue/exceptions/queue.exception';

/** @public */
export class NotificationEmailDeliveryUnknownException extends QueueException {
    constructor(
        readonly message: string,
        readonly rawError: unknown,
        readonly batchId: string,
        readonly unknownCount: number
    ) {
        super(message, true, rawError);
    }
}
