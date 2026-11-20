import { Logger } from '@nestjs/common';
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
        errorListener = null;
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

        it('classifies a connection error raised on the queue and does not log it', () => {
            const warn = vi.spyOn(Logger.prototype, 'warn');
            const error = new Error('connect ECONNREFUSED 127.0.0.1:6379');
            cacheService.isConnectionError.mockReturnValue(true);

            expect(errorListener).not.toBeNull();
            expect(() => errorListener?.(error)).not.toThrow();
            expect(cacheService.isConnectionError).toHaveBeenCalledWith(error);
            expect(warn).not.toHaveBeenCalled();
        });

        it('classifies any other error raised on the queue and logs a warning', () => {
            const warn = vi.spyOn(Logger.prototype, 'warn');
            const error = new Error('queue failure');
            cacheService.isConnectionError.mockReturnValue(false);

            expect(errorListener).not.toBeNull();
            expect(() => errorListener?.(error)).not.toThrow();
            expect(cacheService.isConnectionError).toHaveBeenCalledWith(error);
            expect(warn).toHaveBeenCalledWith(error, 'Queue error');
        });
    });
});
