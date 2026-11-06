import { NotificationEmailDeliveryUnknownException } from '@modules/notification/exceptions/notification.email-delivery-unknown.exception';
import { QueueException } from '@queues/exceptions/queue.exception';

describe('NotificationEmailDeliveryUnknownException', () => {
    const message = 'notification.queue.email.error.deliveryUnknown';

    describe('constructor', () => {
        it('declares a fatal QueueException naming the batch and the unknown count', () => {
            const exception = new NotificationEmailDeliveryUnknownException(
                message,
                'batch-id',
                2
            );

            expect(exception).toBeInstanceOf(QueueException);
            expect(exception).toMatchObject({
                message,
                isFatal: true,
                rawError: null,
                batchId: 'batch-id',
                unknownCount: 2,
            });
        });

        it('chains the error that made the outcome unknown as rawError and cause', () => {
            const cause = new Error('socket hang up');
            const exception = new NotificationEmailDeliveryUnknownException(
                message,
                'batch-id',
                2,
                cause
            );

            expect(exception).toMatchObject({ rawError: cause, cause });
        });
    });
});
