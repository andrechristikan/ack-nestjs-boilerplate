import { getQueueToken } from '@nestjs/bullmq';
import { Test } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import type { Queue } from 'bullmq';
import { mock } from 'vitest-mock-extended';
import type { MockProxy } from 'vitest-mock-extended';
import { EnumMfaProcess, EnumMfaQueue } from '@modules/mfa/enums/mfa.enum';
import { MfaQueue } from '@modules/mfa/queues/mfa.queue';
import { EnumQueuePriority } from '@common/queue/enums/queue.enum';
import { buildConfigService } from '@test/unit/helpers/test.unit.config.helper';

describe('MfaQueue', () => {
    const mfaQueue: MockProxy<Queue> = mock<Queue>();
    let configService: MockProxy<ConfigService>;
    let queue: MfaQueue;

    beforeEach(async () => {
        configService = buildConfigService({
            'app.timezone': 'UTC',
            'mfa.purgeExpiredCron': '0 3 * * *',
        });
        const module = await Test.createTestingModule({
            providers: [
                MfaQueue,
                {
                    provide: getQueueToken(EnumMfaQueue.mfa),
                    useValue: mfaQueue,
                },
                { provide: ConfigService, useValue: configService },
            ],
        }).compile();
        queue = module.get(MfaQueue);
        mfaQueue.getJobSchedulers.mockResolvedValue([]);
    });

    describe('onModuleInit', () => {
        it('schedules the recurring purge of expired challenges', async () => {
            await queue.onModuleInit();

            expect(mfaQueue.upsertJobScheduler).toHaveBeenCalledTimes(1);
            expect(mfaQueue.upsertJobScheduler).toHaveBeenCalledWith(
                EnumMfaProcess.purgeExpired,
                { pattern: '0 3 * * *', tz: 'UTC' },
                {
                    name: EnumMfaProcess.purgeExpired,
                    data: {},
                    opts: { priority: EnumQueuePriority.low },
                }
            );
        });

        it('rejects when the scheduler upsert rejects', async () => {
            const error = new Error('redis down');
            mfaQueue.upsertJobScheduler.mockRejectedValue(error);

            await expect(queue.onModuleInit()).rejects.toBe(error);
        });
    });
});
