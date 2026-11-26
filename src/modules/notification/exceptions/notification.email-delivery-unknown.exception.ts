import { QueueUnrecoverableException } from '@common/queue/exceptions/queue.unrecoverable.exception';

/** @public */
export class NotificationEmailDeliveryUnknownException extends QueueUnrecoverableException {
    constructor(
        override readonly message: string,
        override readonly rawError: unknown,
        readonly batchId: string,
        readonly unknownCount: number
    ) {
        super(message, true, rawError);
    }
}
