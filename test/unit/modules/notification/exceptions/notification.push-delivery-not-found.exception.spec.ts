import { NotificationPushDeliveryNotFoundException } from '@modules/notification/exceptions/notification.push-delivery-not-found.exception';
import { QueueException } from '@common/queue/exceptions/queue.exception';
import { QueueUnrecoverableException } from '@common/queue/exceptions/queue.unrecoverable.exception';

describe('NotificationPushDeliveryNotFoundException', () => {
    describe('constructor', () => {
        it('declares a fatal QueueUnrecoverableException carrying the message', () => {
            const message = 'notification.queue.push.error.deliveryNotFound';

            const exception = new NotificationPushDeliveryNotFoundException(
                message
            );

            expect(exception).toBeInstanceOf(QueueException);
            expect(exception).toBeInstanceOf(QueueUnrecoverableException);
            expect(exception).toMatchObject({
                message,
                isFatal: true,
                rawError: null,
            });
        });
    });
});
