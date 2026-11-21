import { getQueueToken } from '@nestjs/bullmq';
import { Test } from '@nestjs/testing';
import type { Queue } from 'bullmq';
import { mock } from 'vitest-mock-extended';
import type { MockProxy } from 'vitest-mock-extended';
import { EnumQueuePriority } from '@common/queue/enums/queue.enum';
import {
    EnumSessionProcess,
    EnumSessionQueue,
} from '@modules/session/enums/session.enum';
import { SessionQueue } from '@modules/session/queues/session.queue';

describe('SessionQueue', () => {
    const bullQueue: MockProxy<Queue> = mock<Queue>();
    let queue: SessionQueue;

    beforeEach(async () => {
        const module = await Test.createTestingModule({
            providers: [
                SessionQueue,
                {
                    provide: getQueueToken(EnumSessionQueue.session),
                    useValue: bullQueue,
                },
            ],
        }).compile();
        queue = module.get(SessionQueue);
    });

    describe('purgeLoginsEffect', () => {
        it('returns the high-priority purge-logins effect carrying the user and session refs and no business key', () => {
            const effect = queue.purgeLoginsEffect('user-id', [
                { id: 'session-1' },
                { id: 'session-2' },
            ]);

            expect(effect).toEqual({
                queue: EnumSessionQueue.session,
                name: EnumSessionProcess.purgeLogins,
                data: {
                    userId: 'user-id',
                    sessions: [{ id: 'session-1' }, { id: 'session-2' }],
                },
                priority: EnumQueuePriority.high,
                idempotencyKey: null,
            });
        });
    });
});
