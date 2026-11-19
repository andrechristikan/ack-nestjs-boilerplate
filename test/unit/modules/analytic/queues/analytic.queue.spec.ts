import { CacheService } from '@common/cache/services/cache.service';
import { EnumQueuePriority } from '@common/queue/enums/queue.enum';
import { EnumAnalyticSnapshotSignal } from '@generated/prisma-client/client';
import {
    EnumAnalyticProcess,
    EnumAnalyticQueue,
} from '@modules/analytic/enums/analytic.enum';
import { AnalyticQueue } from '@modules/analytic/queues/analytic.queue';
import { getQueueToken } from '@nestjs/bullmq';
import { ConfigService } from '@nestjs/config';
import { Test } from '@nestjs/testing';
import type { TestingModule } from '@nestjs/testing';
import type { Queue } from 'bullmq';
import { mock } from 'vitest-mock-extended';
import type { MockProxy } from 'vitest-mock-extended';

describe('AnalyticQueue', () => {
    const configGet = vi.fn<(key: string) => unknown>();
    const configService: MockProxy<ConfigService> = mock<ConfigService>({
        get: configGet as ConfigService['get'],
    });
    const analyticQueue: MockProxy<Queue> = mock<Queue>();
    const cacheService: MockProxy<CacheService> = mock<CacheService>();
    const refreshIntervalInMs = 900000;
    let queue: AnalyticQueue;

    beforeEach(async () => {
        vi.resetAllMocks();
        configGet.mockImplementation((key: string) => {
            const values: Record<string, number> = {
                'analytic.snapshot.refreshIntervalInMs': refreshIntervalInMs,
            };

            return values[key];
        });

        const module: TestingModule = await Test.createTestingModule({
            providers: [
                AnalyticQueue,
                {
                    provide: getQueueToken(EnumAnalyticQueue.analytic),
                    useValue: analyticQueue,
                },
                { provide: CacheService, useValue: cacheService },
                { provide: ConfigService, useValue: configService },
            ],
        }).compile();

        queue = module.get(AnalyticQueue);
    });

    describe('onModuleInit', () => {
        it('schedules one refresh job per snapshot signal, running at once, at low priority', async () => {
            await queue.onModuleInit();

            expect(analyticQueue.upsertJobScheduler).toHaveBeenCalledTimes(
                Object.values(EnumAnalyticSnapshotSignal).length
            );
            expect(analyticQueue.upsertJobScheduler).toHaveBeenCalledWith(
                `${EnumAnalyticProcess.refreshSnapshot}:${EnumAnalyticSnapshotSignal.sharedFingerprint}`,
                { every: refreshIntervalInMs, immediately: true },
                {
                    name: EnumAnalyticProcess.refreshSnapshot,
                    data: {
                        signal: EnumAnalyticSnapshotSignal.sharedFingerprint,
                    },
                    opts: { priority: EnumQueuePriority.low },
                }
            );
        });

        it('schedules exactly the eight generated signals', async () => {
            await queue.onModuleInit();

            expect(Object.values(EnumAnalyticSnapshotSignal)).toHaveLength(8);
            expect(analyticQueue.upsertJobScheduler).toHaveBeenCalledTimes(8);
        });

        it.each([
            'loginSpikeIp',
            'credentialStuffing',
            'accountTakeover',
            'sessionAfterAdmin',
        ])('adds no scheduler for %s, which answers on request', async name => {
            await queue.onModuleInit();

            expect(analyticQueue.upsertJobScheduler).not.toHaveBeenCalledWith(
                `${EnumAnalyticProcess.refreshSnapshot}:${name}`,
                expect.anything(),
                expect.anything()
            );
        });

        it('rejects when a scheduler upsert rejects', async () => {
            const error = new Error('redis down');
            analyticQueue.upsertJobScheduler.mockRejectedValue(error);

            await expect(queue.onModuleInit()).rejects.toBe(error);
        });
    });
});
