import { getQueueToken } from '@nestjs/bullmq';
import { Test } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import type { Queue } from 'bullmq';
import { CacheService } from '@common/cache/services/cache.service';
import { mock } from 'vitest-mock-extended';
import type { MockProxy } from 'vitest-mock-extended';
import { EnumUserProcess, EnumUserQueue } from '@modules/user/enums/user.enum';
import { UserQueue } from '@modules/user/queues/user.queue';
import { EnumQueuePriority } from '@common/queue/enums/queue.enum';

describe('UserQueue', () => {
    const userQueue: MockProxy<Queue> = mock<Queue>();
    const cacheService: MockProxy<CacheService> = mock<CacheService>();
    const configService: MockProxy<ConfigService> = mock<ConfigService>();
    let queue: UserQueue;

    beforeEach(async () => {
        vi.resetAllMocks();
        vi.mocked(configService.get).mockImplementation((key: string) => {
            const values: Record<string, unknown> = {
                'app.timezone': 'UTC',
                'user.purgeExpiredCron': '0 3 * * *',
            };

            return values[key];
        });
        const module = await Test.createTestingModule({
            providers: [
                UserQueue,
                {
                    provide: getQueueToken(EnumUserQueue.user),
                    useValue: userQueue,
                },
                { provide: CacheService, useValue: cacheService },
                { provide: ConfigService, useValue: configService },
            ],
        }).compile();
        queue = module.get(UserQueue);
    });

    describe('onModuleInit', () => {
        it('schedules the recurring purge of expired identity rows', async () => {
            await queue.onModuleInit();

            expect(userQueue.upsertJobScheduler).toHaveBeenCalledTimes(1);
            expect(userQueue.upsertJobScheduler).toHaveBeenCalledWith(
                EnumUserProcess.purgeExpired,
                { pattern: '0 3 * * *', tz: 'UTC' },
                {
                    name: EnumUserProcess.purgeExpired,
                    data: {},
                    opts: { priority: EnumQueuePriority.low },
                }
            );
        });

        it('rejects when the scheduler upsert rejects', async () => {
            const error = new Error('redis down');
            userQueue.upsertJobScheduler.mockRejectedValue(error);

            await expect(queue.onModuleInit()).rejects.toBe(error);
        });
    });
});
