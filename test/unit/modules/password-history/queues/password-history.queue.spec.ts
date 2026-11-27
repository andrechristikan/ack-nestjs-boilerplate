import { getQueueToken } from '@nestjs/bullmq';
import { Test } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import type { Queue } from 'bullmq';
import { mock } from 'vitest-mock-extended';
import type { MockProxy } from 'vitest-mock-extended';
import {
    EnumPasswordHistoryProcess,
    EnumPasswordHistoryQueue,
} from '@modules/password-history/enums/password-history.enum';
import { PasswordHistoryQueue } from '@modules/password-history/queues/password-history.queue';
import { EnumQueuePriority } from '@common/queue/enums/queue.enum';
import { buildConfigService } from '@test/unit/helpers/test.unit.config.helper';

describe('PasswordHistoryQueue', () => {
    const passwordHistoryQueue: MockProxy<Queue> = mock<Queue>();
    let configService: MockProxy<ConfigService>;
    let queue: PasswordHistoryQueue;

    beforeEach(async () => {
        configService = buildConfigService({
            'app.timezone': 'UTC',
            'passwordHistory.purgeExpiredCron': '0 3 * * *',
        });
        const module = await Test.createTestingModule({
            providers: [
                PasswordHistoryQueue,
                {
                    provide: getQueueToken(
                        EnumPasswordHistoryQueue.passwordHistory
                    ),
                    useValue: passwordHistoryQueue,
                },
                { provide: ConfigService, useValue: configService },
            ],
        }).compile();
        queue = module.get(PasswordHistoryQueue);
        passwordHistoryQueue.getJobSchedulers.mockResolvedValue([]);
    });

    describe('onModuleInit', () => {
        it('schedules the recurring purge of expired password histories', async () => {
            await queue.onModuleInit();

            expect(
                passwordHistoryQueue.upsertJobScheduler
            ).toHaveBeenCalledTimes(1);
            expect(
                passwordHistoryQueue.upsertJobScheduler
            ).toHaveBeenCalledWith(
                EnumPasswordHistoryProcess.purgeExpired,
                { pattern: '0 3 * * *', tz: 'UTC' },
                {
                    name: EnumPasswordHistoryProcess.purgeExpired,
                    data: {},
                    opts: { priority: EnumQueuePriority.low },
                }
            );
        });

        it('rejects when the scheduler upsert rejects', async () => {
            const error = new Error('redis down');
            passwordHistoryQueue.upsertJobScheduler.mockRejectedValue(error);

            await expect(queue.onModuleInit()).rejects.toBe(error);
        });
    });
});
