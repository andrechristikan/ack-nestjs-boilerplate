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
import { buildConfigService } from '@test/unit/helpers/test.unit.config.helper';

describe('AnalyticQueue', () => {
    let configService: MockProxy<ConfigService>;
    const analyticQueue: MockProxy<Queue> = mock<Queue>();
    const refreshIntervalInMs = 900000;
    let queue: AnalyticQueue;

    beforeEach(async () => {
        configService = buildConfigService({
            'analytic.snapshot.refreshIntervalInMs': refreshIntervalInMs,
        });

        const module: TestingModule = await Test.createTestingModule({
            providers: [
                AnalyticQueue,
                {
                    provide: getQueueToken(EnumAnalyticQueue.analytic),
                    useValue: analyticQueue,
                },
                { provide: ConfigService, useValue: configService },
            ],
        }).compile();

        queue = module.get(AnalyticQueue);
        analyticQueue.getJobSchedulers.mockResolvedValue([]);
    });

    describe('onModuleInit', () => {
        it.each(Object.values(EnumAnalyticSnapshotSignal))(
            'schedules the refresh of %s every refresh interval, running at once, at low priority',
            async signal => {
                await queue.onModuleInit();

                expect(analyticQueue.upsertJobScheduler).toHaveBeenCalledWith(
                    `${EnumAnalyticProcess.refreshSnapshot}:${signal}`,
                    { every: refreshIntervalInMs, immediately: true },
                    {
                        name: EnumAnalyticProcess.refreshSnapshot,
                        data: { signal },
                        opts: { priority: EnumQueuePriority.low },
                    }
                );
            }
        );

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

        it('removes a held scheduler no signal declares', async () => {
            analyticQueue.getJobSchedulers.mockResolvedValue([
                {
                    key: 'refreshSnapshot:devicesPerUser',
                    name: EnumAnalyticProcess.refreshSnapshot,
                },
            ]);

            await queue.onModuleInit();

            expect(analyticQueue.removeJobScheduler).toHaveBeenCalledTimes(1);
            expect(analyticQueue.removeJobScheduler).toHaveBeenCalledWith(
                'refreshSnapshot:devicesPerUser'
            );
        });

        it('rejects when a scheduler upsert rejects', async () => {
            const error = new Error('redis down');
            analyticQueue.upsertJobScheduler.mockRejectedValue(error);

            await expect(queue.onModuleInit()).rejects.toBe(error);
        });
    });
});
