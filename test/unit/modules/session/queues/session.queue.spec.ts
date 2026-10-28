import { Test } from '@nestjs/testing';
import type { TestingModule } from '@nestjs/testing';
import { getQueueToken } from '@nestjs/bullmq';
import { ConfigService } from '@nestjs/config';
import { mock } from 'vitest-mock-extended';
import type { MockProxy } from 'vitest-mock-extended';
import type { Queue } from 'bullmq';
import { SentryService } from '@common/sentry/services/sentry.service';
import { DatabaseUtil } from '@common/database/utils/database.util';
import { HelperStringService } from '@common/helper/services/helper.string.service';
import { EnumQueue, EnumQueuePriority } from '@queues/enums/queue.enum';
import { EnumSessionProcess } from '@modules/session/enums/session.enum';
import { SessionQueue } from '@modules/session/queues/session.queue';
import { MessageService } from '@common/message/services/message.service';

describe('SessionQueue', () => {
    const messageService: MockProxy<MessageService> = mock<MessageService>();
    const sessionQueue: MockProxy<Queue> = mock<Queue>();
    const sentryService: MockProxy<SentryService> = mock<SentryService>();
    const configService: MockProxy<ConfigService> = mock<ConfigService>();
    const databaseUtil: MockProxy<DatabaseUtil> = mock<DatabaseUtil>();
    const helperStringService: MockProxy<HelperStringService> =
        mock<HelperStringService>();
    let queue: SessionQueue;

    beforeEach(async () => {
        vi.resetAllMocks();
        messageService.setMessage.mockImplementation((path: string) => path);
        vi.mocked(configService.get).mockImplementation((key: string) => {
            const values: Record<string, unknown> = {
                'session.jobId.purgeLoginsPattern': '{process}-{nonce}',
            };

            return values[key];
        });

        const module: TestingModule = await Test.createTestingModule({
            providers: [
                { provide: MessageService, useValue: messageService },
                SessionQueue,
                {
                    provide: getQueueToken(EnumQueue.session),
                    useValue: sessionQueue,
                },
                { provide: SentryService, useValue: sentryService },
                { provide: ConfigService, useValue: configService },
                { provide: DatabaseUtil, useValue: databaseUtil },
                { provide: HelperStringService, useValue: helperStringService },
            ],
        }).compile();

        queue = module.get(SessionQueue);
    });

    describe('purgeLogins', () => {
        it('adds a purge job with the exact session refs under a fresh job id', async () => {
            databaseUtil.createId.mockReturnValue('nonce-1');
            helperStringService.fillPattern.mockReturnValue(
                'purgeLogins-nonce-1'
            );

            await queue.purgeLogins('user-1', [
                { id: 'session-1' },
                { id: 'session-2' },
            ]);

            expect(helperStringService.fillPattern).toHaveBeenCalledWith(
                '{process}-{nonce}',
                { process: EnumSessionProcess.purgeLogins, nonce: 'nonce-1' }
            );
            expect(sessionQueue.add).toHaveBeenCalledWith(
                EnumSessionProcess.purgeLogins,
                {
                    userId: 'user-1',
                    sessions: [{ id: 'session-1' }, { id: 'session-2' }],
                },
                {
                    priority: EnumQueuePriority.high,
                    jobId: 'purgeLogins-nonce-1',
                }
            );
        });

        it('adds nothing when no session was revoked', async () => {
            await queue.purgeLogins('user-1', []);

            expect(sessionQueue.add).not.toHaveBeenCalled();
        });

        it('resolves and reports the failure when the add rejects', async () => {
            const error = new Error('redis down');
            sessionQueue.add.mockRejectedValue(error);

            await expect(
                queue.purgeLogins('user-1', [{ id: 'session-1' }])
            ).resolves.toBeUndefined();

            expect(sentryService.captureException).toHaveBeenCalledWith(
                expect.objectContaining({
                    rawError: error,
                    message: 'session.queue.error.enqueuePurgeLogins',
                })
            );
        });
    });
});
