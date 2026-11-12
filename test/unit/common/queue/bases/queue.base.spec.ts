import type { Queue, QueueListener } from 'bullmq';
import { mock } from 'vitest-mock-extended';
import type { MockProxy } from 'vitest-mock-extended';
import { CacheService } from '@common/cache/services/cache.service';
import { QueueBase } from '@common/queue/bases/queue.base';

describe('QueueBase', () => {
    const queue: MockProxy<Queue> = mock<Queue>();
    const cacheService: MockProxy<CacheService> = mock<CacheService>();
    let errorListener: QueueListener['error'] | null = null;

    beforeEach(() => {
        vi.resetAllMocks();
        queue.on.mockImplementation((_event, listener) => {
            errorListener = listener as QueueListener['error'];

            return queue;
        });
        Reflect.construct(QueueBase, [queue, cacheService]);
    });

    describe('constructor', () => {
        it('registers one error listener on the queue', () => {
            expect(queue.on).toHaveBeenCalledTimes(1);
            expect(queue.on).toHaveBeenCalledWith(
                'error',
                expect.any(Function)
            );
        });

        it('classifies a connection error raised on the queue and returns without throwing', () => {
            const error = new Error('connect ECONNREFUSED 127.0.0.1:6379');
            cacheService.isConnectionError.mockReturnValue(true);

            expect(() => errorListener?.(error)).not.toThrow();
            expect(cacheService.isConnectionError).toHaveBeenCalledWith(error);
        });

        it('classifies any other error raised on the queue and handles it without throwing', () => {
            const error = new Error('queue failure');
            cacheService.isConnectionError.mockReturnValue(false);

            expect(() => errorListener?.(error)).not.toThrow();
            expect(cacheService.isConnectionError).toHaveBeenCalledWith(error);
        });
    });
});
