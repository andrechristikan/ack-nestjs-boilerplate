import { QueueException } from '@queues/exceptions/queue.exception';

describe('QueueException', () => {
    describe('constructor', () => {
        it('carries the message and defaults isFatal to false when omitted', () => {
            const exception = new QueueException('job failed');

            expect(exception).toBeInstanceOf(Error);
            expect(exception.message).toBe('job failed');
            expect(exception.isFatal).toBe(false);
        });

        it('sets isFatal to true when given true', () => {
            const exception = new QueueException('job failed', true);

            expect(exception.message).toBe('job failed');
            expect(exception.isFatal).toBe(true);
        });

        it('sets isFatal to false when given false', () => {
            const exception = new QueueException('job failed', false);

            expect(exception.message).toBe('job failed');
            expect(exception.isFatal).toBe(false);
        });
    });
});
