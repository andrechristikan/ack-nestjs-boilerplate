import { QueueException } from '@common/queue/exceptions/queue.exception';
import { QueueUnrecoverableException } from '@common/queue/exceptions/queue.unrecoverable.exception';

describe('QueueUnrecoverableException', () => {
    describe('constructor', () => {
        it('is a QueueException that defaults isFatal to true and rawError to null', () => {
            const exception = new QueueUnrecoverableException('hopeless');

            expect(exception).toBeInstanceOf(QueueException);
            expect(exception.message).toBe('hopeless');
            expect(exception.isFatal).toBe(true);
            expect(exception.rawError).toBeNull();
            expect(exception.cause).toBeUndefined();
        });

        it('keeps the given isFatal and chains the rawError as the cause', () => {
            const rawError = new Error('bad payload');

            const exception = new QueueUnrecoverableException(
                'hopeless',
                false,
                rawError
            );

            expect(exception.isFatal).toBe(false);
            expect(exception.rawError).toBe(rawError);
            expect(exception.cause).toBe(rawError);
        });
    });
});
