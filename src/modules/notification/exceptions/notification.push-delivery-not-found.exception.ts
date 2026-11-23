import { QueueException } from '@common/queue/exceptions/queue.exception';

/** @public */
export class NotificationPushDeliveryNotFoundException extends QueueException {
    constructor(override readonly message: string) {
        super(message, true);
    }
}
