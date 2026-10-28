import { QueueException } from '@queues/exceptions/queue.exception';

describe('QueueException', () => {
    describe('constructor', () => {
        it('carries the message and defaults isFatal to false and rawError to null when omitted', () => {
            const exception = new QueueException('job failed');

            expect(exception).toBeInstanceOf(Error);
            expect(exception.message).toBe('job failed');
            expect(exception.isFatal).toBe(false);
            expect(exception.rawError).toBeNull();
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

        it('carries the rawError when given', () => {
            const rawError = new Error('redis down');

            const exception = new QueueException('job failed', false, rawError);

            expect(exception.rawError).toBe(rawError);
            expect(exception.isFatal).toBe(false);
        });

        it('defaults rawError to null when given null', () => {
            const exception = new QueueException('job failed', false, null);

            expect(exception.rawError).toBeNull();
        });
    });
});
