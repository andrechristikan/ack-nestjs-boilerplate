import { Logger } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import type { TestingModule } from '@nestjs/testing';
import { getQueueToken } from '@nestjs/bullmq';
import { HealthIndicatorService } from '@nestjs/terminus';
import { mock } from 'vitest-mock-extended';
import type { MockProxy } from 'vitest-mock-extended';

import { HealthQueueIndicator } from '@modules/health/indicators/health.queue.indicator';
import type { Queue, QueueListener } from 'bullmq';
import {
    EnumHealthIndicatorKey,
    EnumHealthQueue,
} from '@modules/health/enums/health.enum';

describe('HealthQueueIndicator', () => {
    const getBackend = vi.fn();
    const queue: MockProxy<Queue> = mock<Queue>({
        getBackend: getBackend as Queue['getBackend'],
    });
    const healthIndicatorService: MockProxy<HealthIndicatorService> =
        mock<HealthIndicatorService>();
    const session = { up: vi.fn(), down: vi.fn() };

    let indicator: HealthQueueIndicator;
    let errorListener: QueueListener['error'] | null = null;

    beforeEach(async () => {
        queue.on.mockImplementation((_event, listener) => {
            errorListener = listener as QueueListener['error'];

            return queue;
        });

        healthIndicatorService.check.mockReturnValue(session as never);

        const module: TestingModule = await Test.createTestingModule({
            providers: [
                HealthQueueIndicator,
                {
                    provide: getQueueToken(EnumHealthQueue.health),
                    useValue: queue,
                },
                {
                    provide: HealthIndicatorService,
                    useValue: healthIndicatorService,
                },
            ],
        }).compile();

        indicator = module.get(HealthQueueIndicator);
    });

    describe('constructor', () => {
        it('registers one error listener on the queue', () => {
            expect(queue.on).toHaveBeenCalledTimes(1);
            expect(queue.on).toHaveBeenCalledWith(
                'error',
                expect.any(Function)
            );
        });

        it('logs a warning for a connection error raised on the queue', () => {
            const warn = vi.spyOn(Logger.prototype, 'warn');
            const error = new Error('connect ECONNREFUSED 127.0.0.1:6379');

            expect(() => errorListener?.(error)).not.toThrow();
            expect(warn).toHaveBeenCalledWith(error, 'Health queue error');
        });

        it('logs a warning for any other error raised on the queue', () => {
            const warn = vi.spyOn(Logger.prototype, 'warn');
            const error = new Error('queue failure');

            expect(() => errorListener?.(error)).not.toThrow();
            expect(warn).toHaveBeenCalledWith(error, 'Health queue error');
        });
    });

    describe('isHealthy', () => {
        it('reports up when the Redis client status is ready', async () => {
            getBackend.mockReturnValue({
                client: Promise.resolve({ status: 'ready' }),
            });
            session.up.mockReturnValue({ queue: { status: 'up' } });

            const result = await indicator.isHealthy(
                EnumHealthIndicatorKey.queue
            );

            expect(result).toEqual({ queue: { status: 'up' } });
            expect(healthIndicatorService.check).toHaveBeenCalledWith('queue');
            expect(session.up).toHaveBeenCalledWith();
        });

        it('reports down when the Redis client status is not ready', async () => {
            getBackend.mockReturnValue({
                client: Promise.resolve({ status: 'connecting' }),
            });
            session.down.mockReturnValue({ queue: { status: 'down' } });

            const result = await indicator.isHealthy(
                EnumHealthIndicatorKey.queue
            );

            expect(result).toEqual({ queue: { status: 'down' } });
            expect(session.down).toHaveBeenCalledWith(
                'BullMQ Redis client is not ready'
            );
        });

        it('reports down when the Redis client is absent', async () => {
            getBackend.mockReturnValue({ client: Promise.resolve(null) });
            session.down.mockReturnValue({ queue: { status: 'down' } });

            const result = await indicator.isHealthy(
                EnumHealthIndicatorKey.queue
            );

            expect(result).toEqual({ queue: { status: 'down' } });
            expect(session.down).toHaveBeenCalledWith(
                'BullMQ Redis client is not ready'
            );
        });

        it('logs the cause and reports down when reading the backend throws', async () => {
            const failure = new Error('backend unavailable');
            const loggerError = vi
                .spyOn(Logger.prototype, 'error')
                .mockImplementation(() => undefined);
            getBackend.mockImplementation(() => {
                throw failure;
            });
            session.down.mockReturnValue({ queue: { status: 'down' } });

            const result = await indicator.isHealthy(
                EnumHealthIndicatorKey.queue
            );

            expect(result).toEqual({ queue: { status: 'down' } });
            expect(loggerError).toHaveBeenCalledWith(
                failure,
                'Queue health check failed'
            );
            expect(session.down).toHaveBeenCalledWith(
                'BullMQ queue is unreachable'
            );
        });
    });
});
