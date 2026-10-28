import { QueueException } from '@queues/exceptions/queue.exception';
import { QueueSideEffectFailedException } from '@queues/exceptions/queue.side-effect-failed.exception';

describe('QueueSideEffectFailedException', () => {
    describe('constructor', () => {
        it('carries the description as message, the raw error, and is fatal', () => {
            const rawError = new Error('redis down');

            const exception = new QueueSideEffectFailedException(
                'enqueue welcome',
                rawError
            );

            expect(exception).toBeInstanceOf(QueueException);
            expect(exception.message).toBe('enqueue welcome');
            expect(exception.rawError).toBe(rawError);
            expect(exception.isFatal).toBe(true);
        });
    });
});
