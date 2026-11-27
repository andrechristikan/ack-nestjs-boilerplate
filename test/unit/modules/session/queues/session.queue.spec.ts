import { getQueueToken } from '@nestjs/bullmq';
import { Test } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import type { Queue } from 'bullmq';
import { mock } from 'vitest-mock-extended';
import type { MockProxy } from 'vitest-mock-extended';
import {
    EnumSessionProcess,
    EnumSessionQueue,
} from '@modules/session/enums/session.enum';
import { SessionQueue } from '@modules/session/queues/session.queue';
import { EnumQueuePriority } from '@common/queue/enums/queue.enum';
import { buildConfigService } from '@test/unit/helpers/test.unit.config.helper';

describe('SessionQueue', () => {
    const sessionQueue: MockProxy<Queue> = mock<Queue>();
    let configService: MockProxy<ConfigService>;
    let queue: SessionQueue;

    beforeEach(async () => {
        configService = buildConfigService({
            'app.timezone': 'UTC',
            'session.purgeExpiredCron': '0 3 * * *',
        });
        const module = await Test.createTestingModule({
            providers: [
                SessionQueue,
                {
                    provide: getQueueToken(EnumSessionQueue.session),
                    useValue: sessionQueue,
                },
                { provide: ConfigService, useValue: configService },
            ],
        }).compile();
        queue = module.get(SessionQueue);
        sessionQueue.getJobSchedulers.mockResolvedValue([]);
    });

    describe('onModuleInit', () => {
        it('schedules the recurring purge of expired sessions', async () => {
            await queue.onModuleInit();

            expect(sessionQueue.upsertJobScheduler).toHaveBeenCalledTimes(1);
            expect(sessionQueue.upsertJobScheduler).toHaveBeenCalledWith(
                EnumSessionProcess.purgeExpired,
                { pattern: '0 3 * * *', tz: 'UTC' },
                {
                    name: EnumSessionProcess.purgeExpired,
                    data: {},
                    opts: { priority: EnumQueuePriority.low },
                }
            );
        });

        it('rejects when the scheduler upsert rejects', async () => {
            const error = new Error('redis down');
            sessionQueue.upsertJobScheduler.mockRejectedValue(error);

            await expect(queue.onModuleInit()).rejects.toBe(error);
        });
    });

    describe('purgeLoginsEffect', () => {
        it('returns the high-priority purge-logins effect carrying the user and session refs and no business key', () => {
            const effect = queue.purgeLoginsEffect('user-1', [
                { id: 'session-1', userId: 'user-1' },
            ]);

            expect(effect).toEqual({
                queue: EnumSessionQueue.session,
                name: EnumSessionProcess.purgeLogins,
                data: {
                    userId: 'user-1',
                    sessions: [{ id: 'session-1', userId: 'user-1' }],
                },
                priority: EnumQueuePriority.high,
                idempotencyKey: null,
            });
        });
    });
});
