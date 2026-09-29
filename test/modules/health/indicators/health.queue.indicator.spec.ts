import { Test } from '@nestjs/testing';
import type { TestingModule } from '@nestjs/testing';
import { getQueueToken } from '@nestjs/bullmq';
import { HealthIndicatorService } from '@nestjs/terminus';
import { mock } from 'vitest-mock-extended';
import type { MockProxy } from 'vitest-mock-extended';
import { EnumQueue } from '@queues/enums/queue.enum';
import { HealthQueueIndicator } from '@modules/health/indicators/health.queue.indicator';
import type { Queue } from 'bullmq';

describe('HealthQueueIndicator', () => {
    const getBackend = vi.fn();
    const queue: MockProxy<Queue> = mock<Queue>({
        getBackend: getBackend as Queue['getBackend'],
    });
    const healthIndicatorService: MockProxy<HealthIndicatorService> =
        mock<HealthIndicatorService>();
    const session = { up: vi.fn(), down: vi.fn() };

    let indicator: HealthQueueIndicator;

    beforeEach(async () => {
        vi.resetAllMocks();

        healthIndicatorService.check.mockReturnValue(session as never);

        const module: TestingModule = await Test.createTestingModule({
            providers: [
                HealthQueueIndicator,
                {
                    provide: getQueueToken(EnumQueue.notification),
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

    describe('isHealthy', () => {
        it('reports up when the Redis client status is ready', async () => {
            getBackend.mockReturnValue({
                client: Promise.resolve({ status: 'ready' }),
            });
            session.up.mockReturnValue({ queue: { status: 'up' } });

            const result = await indicator.isHealthy('queue');

            expect(result).toEqual({ queue: { status: 'up' } });
            expect(healthIndicatorService.check).toHaveBeenCalledWith('queue');
            expect(session.up).toHaveBeenCalledWith();
        });

        it('reports down when the Redis client status is not ready', async () => {
            getBackend.mockReturnValue({
                client: Promise.resolve({ status: 'connecting' }),
            });
            session.down.mockReturnValue({ queue: { status: 'down' } });

            const result = await indicator.isHealthy('queue');

            expect(result).toEqual({ queue: { status: 'down' } });
            expect(session.down).toHaveBeenCalledWith(
                'BullMQ Redis client is not ready'
            );
        });

        it('reports down when the Redis client is absent', async () => {
            getBackend.mockReturnValue({ client: Promise.resolve(null) });
            session.down.mockReturnValue({ queue: { status: 'down' } });

            const result = await indicator.isHealthy('queue');

            expect(result).toEqual({ queue: { status: 'down' } });
            expect(session.down).toHaveBeenCalledWith(
                'BullMQ Redis client is not ready'
            );
        });

        it('reports down when reading the backend throws', async () => {
            getBackend.mockImplementation(() => {
                throw new Error('backend unavailable');
            });
            session.down.mockReturnValue({ queue: { status: 'down' } });

            const result = await indicator.isHealthy('queue');

            expect(result).toEqual({ queue: { status: 'down' } });
            expect(session.down).toHaveBeenCalledWith(
                'HealthQueueIndicator Failed - Unknown error'
            );
        });
    });
});
