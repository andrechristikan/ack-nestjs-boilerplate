import { QueueException } from '@common/queue/exceptions/queue.exception';

/** @public */
export class NotificationPushDeliveryNotFoundException extends QueueException {
    constructor(readonly message: string) {
        super(message, true);
    }
}
