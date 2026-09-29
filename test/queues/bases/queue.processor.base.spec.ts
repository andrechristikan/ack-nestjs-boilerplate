import { Job, UnrecoverableError } from 'bullmq';
import type { Scope } from '@sentry/nestjs';
import { Test } from '@nestjs/testing';
import { mock } from 'vitest-mock-extended';
import { SentryService } from '@common/sentry/services/sentry.service';
import { EnumWorkspaceProcess } from '@modules/workspace/enums/workspace.enum';
import { WorkspaceProcessorService } from '@modules/workspace/services/workspace.processor.service';
import { WorkspaceProcessor } from '@modules/workspace/processors/workspace.processor';
import { QueueException } from '@queues/exceptions/queue.exception';

function buildJob(overrides: Partial<Job> = {}): Job {
    return {
        id: 'job-1',
        name: EnumWorkspaceProcess.expireStaleInvites,
        attemptsMade: 0,
        opts: { attempts: 3 },
        log: vi.fn().mockResolvedValue(1),
        ...overrides,
    } as unknown as Job;
}

describe('QueueProcessorBase', () => {
    const sentryService = mock<SentryService>();
    const workspaceProcessorService = mock<WorkspaceProcessorService>();
    let processor: WorkspaceProcessor;

    beforeEach(async () => {
        vi.resetAllMocks();

        const module = await Test.createTestingModule({
            providers: [
                WorkspaceProcessor,
                {
                    provide: WorkspaceProcessorService,
                    useValue: workspaceProcessorService,
                },
                { provide: SentryService, useValue: sentryService },
            ],
        }).compile();

        processor = module.get(WorkspaceProcessor);
    });

    describe('process', () => {
        it('logs the start, input and success lines and returns the handler result', async () => {
            const job = buildJob({ opts: { attempts: 3 }, attemptsMade: 0 });
            workspaceProcessorService.processExpireStaleInvites.mockResolvedValue(
                { message: 'done' }
            );

            const result = await processor.process(job);

            expect(result).toEqual({ message: 'done' });
            expect(
                workspaceProcessorService.processExpireStaleInvites
            ).toHaveBeenCalledWith();
            expect(job.log).toHaveBeenNthCalledWith(1, 'Job started');
            expect(job.log).toHaveBeenNthCalledWith(
                2,
                'Job input id=job-1 name=expireStaleInvites attemptsMade=0 maxAttempts=3'
            );
            expect(job.log).toHaveBeenNthCalledWith(
                3,
                'Job finished {"message":"done"}'
            );
        });

        it('defaults maxAttempts to 1 when the job carries no attempts option', async () => {
            const job = buildJob({ opts: {}, attemptsMade: 0 });
            workspaceProcessorService.processExpireStaleInvites.mockResolvedValue(
                { message: 'done' }
            );

            await processor.process(job);

            expect(job.log).toHaveBeenNthCalledWith(
                2,
                'Job input id=job-1 name=expireStaleInvites attemptsMade=0 maxAttempts=1'
            );
        });

        it('logs the failure line and rethrows an Error raised by the handler', async () => {
            const job = buildJob();
            const error = new Error('handle failed');
            workspaceProcessorService.processExpireStaleInvites.mockRejectedValue(
                error
            );

            await expect(processor.process(job)).rejects.toBe(error);

            expect(job.log).toHaveBeenNthCalledWith(
                3,
                'Job failed handle failed'
            );
        });

        it('logs the failure line with String(error) and rethrows a non-Error raised by the handler', async () => {
            const job = buildJob();
            workspaceProcessorService.processExpireStaleInvites.mockRejectedValue(
                'raw failure reason'
            );

            await expect(processor.process(job)).rejects.toBe(
                'raw failure reason'
            );

            expect(job.log).toHaveBeenNthCalledWith(
                3,
                'Job failed raw failure reason'
            );
        });
    });

    describe('onFailed', () => {
        function stubWithScope(): Scope {
            const scope = { setAttribute: vi.fn() } as unknown as Scope;

            sentryService.withScope.mockImplementation(callback => {
                callback(scope);
            });

            return scope;
        }

        it('reports to Sentry when the error is an UnrecoverableError instance', () => {
            const scope = stubWithScope();
            const job = buildJob({ opts: {}, attemptsMade: 0 });
            const error = new UnrecoverableError('unrecoverable');

            processor.onFailed(job, error);

            expect(scope.setAttribute).toHaveBeenCalledWith('job.id', 'job-1');
            expect(scope.setAttribute).toHaveBeenCalledWith(
                'job.name',
                EnumWorkspaceProcess.expireStaleInvites
            );
            expect(scope.setAttribute).toHaveBeenCalledWith(
                'job.attemptsMade',
                0
            );
            expect(scope.setAttribute).toHaveBeenCalledWith(
                'job.maxAttempts',
                1
            );
            expect(sentryService.captureException).toHaveBeenCalledWith(error);
        });

        it('reports to Sentry when the error carries the UnrecoverableError name without being an instance', () => {
            stubWithScope();
            const job = buildJob({ opts: { attempts: 3 }, attemptsMade: 0 });
            const error = new Error('boom');
            error.name = 'UnrecoverableError';

            processor.onFailed(job, error);

            expect(sentryService.captureException).toHaveBeenCalledWith(error);
        });

        it('reports to Sentry on the final attempt for an ordinary error', () => {
            stubWithScope();
            const job = buildJob({ opts: {}, attemptsMade: 1 });
            const error = new Error('boom');

            processor.onFailed(job, error);

            expect(sentryService.captureException).toHaveBeenCalledWith(error);
        });

        it('does nothing when the attempt is not the last one', () => {
            stubWithScope();
            const job = buildJob({ opts: { attempts: 3 }, attemptsMade: 0 });
            const error = new Error('boom');

            processor.onFailed(job, error);

            expect(sentryService.withScope).not.toHaveBeenCalled();
            expect(sentryService.captureException).not.toHaveBeenCalled();
        });

        it('reports a fatal QueueException on the final attempt', () => {
            stubWithScope();
            const job = buildJob({ opts: {}, attemptsMade: 1 });
            const error = new QueueException('boom', true);

            processor.onFailed(job, error);

            expect(sentryService.captureException).toHaveBeenCalledWith(error);
        });

        it('does nothing for a non-fatal QueueException on the final attempt', () => {
            stubWithScope();
            const job = buildJob({ opts: {}, attemptsMade: 1 });
            const error = new QueueException('boom', false);

            processor.onFailed(job, error);

            expect(sentryService.withScope).not.toHaveBeenCalled();
            expect(sentryService.captureException).not.toHaveBeenCalled();
        });
    });

    describe('writeJobLog', () => {
        it('writes the message on the job', async () => {
            const job = buildJob();

            await processor['writeJobLog'](job, 'a message');

            expect(job.log).toHaveBeenCalledWith('a message');
        });

        it('swallows an Error raised by job.log', async () => {
            const job = buildJob({
                log: vi.fn().mockRejectedValue(new Error('log failed')),
            });

            await expect(
                processor['writeJobLog'](job, 'a message')
            ).resolves.toBeUndefined();
        });

        it('swallows a non-Error rejection from job.log', async () => {
            const job = buildJob({
                log: vi.fn().mockRejectedValue('raw log failure'),
            });

            await expect(
                processor['writeJobLog'](job, 'a message')
            ).resolves.toBeUndefined();
        });
    });
});
