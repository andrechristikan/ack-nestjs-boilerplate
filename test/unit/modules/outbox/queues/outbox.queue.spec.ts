import { Test } from '@nestjs/testing';
import type { TestingModule } from '@nestjs/testing';
import { getQueueToken } from '@nestjs/bullmq';
import { ConfigService } from '@nestjs/config';
import { mock } from 'vitest-mock-extended';
import type { MockProxy } from 'vitest-mock-extended';
import type { Queue } from 'bullmq';
import { CacheService } from '@common/cache/services/cache.service';
import { SentryService } from '@common/sentry/services/sentry.service';
import {
    EnumOutboxProcess,
    EnumOutboxQueue,
} from '@modules/outbox/enums/outbox.enum';
import { OutboxQueue } from '@modules/outbox/queues/outbox.queue';

describe('OutboxQueue', () => {
    const configGet = vi.fn<(key: string) => unknown>();
    const configService: MockProxy<ConfigService> = mock<ConfigService>({
        get: configGet as ConfigService['get'],
    });
    const outboxQueue: MockProxy<Queue> = mock<Queue>();
    const sentryService: MockProxy<SentryService> = mock<SentryService>();
    const cacheService: MockProxy<CacheService> = mock<CacheService>();
    let queue: OutboxQueue;

    beforeEach(async () => {
        vi.resetAllMocks();
        configGet.mockImplementation((key: string) => {
            const values: Record<string, number> = {
                'outbox.sweepIntervalInMs': 60000,
                'outbox.sweepKeepCompleted': 20,
            };

            return values[key];
        });

        const module: TestingModule = await Test.createTestingModule({
            providers: [
                OutboxQueue,
                {
                    provide: getQueueToken(EnumOutboxQueue.outbox),
                    useValue: outboxQueue,
                },
                { provide: SentryService, useValue: sentryService },
                { provide: CacheService, useValue: cacheService },
                { provide: ConfigService, useValue: configService },
            ],
        }).compile();

        queue = module.get(OutboxQueue);
    });

    describe('onModuleInit', () => {
        it('schedules the sweep every sweep interval keeping the last completed jobs', async () => {
            await queue.onModuleInit();

            expect(outboxQueue.upsertJobScheduler).toHaveBeenCalledWith(
                EnumOutboxProcess.sweep,
                { every: 60000 },
                {
                    name: EnumOutboxProcess.sweep,
                    data: {},
                    opts: { removeOnComplete: { count: 20 } },
                }
            );
        });
    });
});
