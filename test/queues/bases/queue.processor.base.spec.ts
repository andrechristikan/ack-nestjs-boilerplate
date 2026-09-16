import * as Sentry from '@sentry/nestjs';
import { describe, expect, it, vi } from 'vitest';

import { QueueProcessorBase } from '@queues/bases/queue.processor.base';
import { QueueException } from '@queues/exceptions/queue.exception';
import type { IQueueResponse } from '@queues/interfaces/queue.interface';
import { createQueueJob } from '@test/support/queue-job.mock';

vi.mock(import('@sentry/nestjs'), () => ({ captureException: vi.fn() }));

class TestProcessor extends QueueProcessorBase {
    process(): Promise<IQueueResponse> {
        return Promise.resolve({ message: 'ok' });
    }
}

describe('QueueProcessorBase', () => {
    const processor = new TestProcessor();
    const captureException = vi.mocked(Sentry.captureException);

    it('reports a fatal error on the final attempt', () => {
        const error = new Error('fatal');
        const job = createQueueJob<unknown, null, string>('job', {});
        job.opts.attempts = 3;
        Object.defineProperty(job, 'attemptsMade', { value: 2 });
        processor.onFailed(job, error);
        expect(captureException).toHaveBeenCalledWith(error);
    });

    it('does not report before the final attempt', () => {
        const job = createQueueJob<unknown, null, string>('job', {});
        job.opts.attempts = 3;
        processor.onFailed(job, new Error('retry'));
        expect(captureException).not.toHaveBeenCalled();
    });

    it('does not report a nonfatal queue exception', () => {
        const job = createQueueJob<unknown, null, string>('job', {});
        processor.onFailed(job, new QueueException('expected', false));
        expect(captureException).not.toHaveBeenCalled();
    });

    it('swallows a Sentry reporting failure', () => {
        captureException.mockImplementation(() => {
            throw new Error('sentry unavailable');
        });
        const job = createQueueJob<unknown, null, string>('job', {});
        expect(() => processor.onFailed(job, new Error('fatal'))).not.toThrow();
    });
});
