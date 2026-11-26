import { QueueUnrecoverableException } from '@common/queue/exceptions/queue.unrecoverable.exception';

/** @public */
export class NotificationPushDeliveryNotFoundException extends QueueUnrecoverableException {
    constructor(override readonly message: string) {
        super(message, true);
    }
}
