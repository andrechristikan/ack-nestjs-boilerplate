import { getQueueToken } from '@nestjs/bullmq';
import { Test } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import type { Queue } from 'bullmq';
import { mock } from 'vitest-mock-extended';
import type { MockProxy } from 'vitest-mock-extended';
import {
    EnumUserAuthProcess,
    EnumUserQueue,
} from '@modules/user/enums/user.enum';
import { UserAuthQueue } from '@modules/user/queues/user.auth.queue';
import { EnumQueuePriority } from '@common/queue/enums/queue.enum';
import { buildConfigService } from '@test/unit/helpers/test.unit.config.helper';

describe('UserAuthQueue', () => {
    const userAuthQueue: MockProxy<Queue> = mock<Queue>();
    let configService: MockProxy<ConfigService>;
    let queue: UserAuthQueue;

    beforeEach(async () => {
        configService = buildConfigService({
            'app.timezone': 'UTC',
            'user.purgeExpiredCron': '0 3 * * *',
        });
        const module = await Test.createTestingModule({
            providers: [
                UserAuthQueue,
                {
                    provide: getQueueToken(EnumUserQueue.userAuth),
                    useValue: userAuthQueue,
                },
                { provide: ConfigService, useValue: configService },
            ],
        }).compile();
        queue = module.get(UserAuthQueue);
    });

    describe('onModuleInit', () => {
        it('schedules the recurring purge of expired identity rows', async () => {
            await queue.onModuleInit();

            expect(userAuthQueue.upsertJobScheduler).toHaveBeenCalledTimes(1);
            expect(userAuthQueue.upsertJobScheduler).toHaveBeenCalledWith(
                EnumUserAuthProcess.purgeExpired,
                { pattern: '0 3 * * *', tz: 'UTC' },
                {
                    name: EnumUserAuthProcess.purgeExpired,
                    data: {},
                    opts: { priority: EnumQueuePriority.low },
                }
            );
        });

        it('rejects when the scheduler upsert rejects', async () => {
            const error = new Error('redis down');
            userAuthQueue.upsertJobScheduler.mockRejectedValue(error);

            await expect(queue.onModuleInit()).rejects.toBe(error);
        });
    });

    describe('purgeLoginsEffect', () => {
        it('returns the high-priority purge-logins effect carrying the user and session refs and no business key', () => {
            const effect = queue.purgeLoginsEffect('user-1', [
                { id: 'session-1' },
            ]);

            expect(effect).toEqual({
                queue: EnumUserQueue.userAuth,
                name: EnumUserAuthProcess.purgeLogins,
                data: { userId: 'user-1', sessions: [{ id: 'session-1' }] },
                priority: EnumQueuePriority.high,
                idempotencyKey: null,
            });
        });
    });
});
