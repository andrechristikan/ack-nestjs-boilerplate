import { Test } from '@nestjs/testing';
import type { TestingModule } from '@nestjs/testing';
import { getQueueToken } from '@nestjs/bullmq';
import { ConfigService } from '@nestjs/config';
import { mock } from 'vitest-mock-extended';
import type { MockProxy } from 'vitest-mock-extended';
import type { Queue } from 'bullmq';
import { CacheService } from '@common/cache/services/cache.service';
import {
    EnumOutboxProcess,
    EnumOutboxQueue,
} from '@common/outbox/enums/outbox.enum';
import { OutboxQueue } from '@common/outbox/queues/outbox.queue';
import { buildConfigService } from '@test/unit/helpers/test.unit.config.helper';

describe('OutboxQueue', () => {
    let configService: MockProxy<ConfigService>;
    const outboxQueue: MockProxy<Queue> = mock<Queue>();
    const cacheService: MockProxy<CacheService> = mock<CacheService>();
    let queue: OutboxQueue;

    beforeEach(async () => {
        configService = buildConfigService({
            'outbox.sweepIntervalInMs': 60000,
            'outbox.sweepKeepCompleted': 20,
        });

        const module: TestingModule = await Test.createTestingModule({
            providers: [
                OutboxQueue,
                {
                    provide: getQueueToken(EnumOutboxQueue.outbox),
                    useValue: outboxQueue,
                },
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
