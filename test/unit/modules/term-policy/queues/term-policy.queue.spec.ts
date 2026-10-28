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
import { EnumTermPolicyProcess } from '@modules/term-policy/enums/term-policy.enum';
import { TermPolicyQueue } from '@modules/term-policy/queues/term-policy.queue';
import { MessageService } from '@common/message/services/message.service';

describe('TermPolicyQueue', () => {
    const messageService: MockProxy<MessageService> = mock<MessageService>();
    const termPolicyQueue: MockProxy<Queue> = mock<Queue>();
    const sentryService: MockProxy<SentryService> = mock<SentryService>();
    const configService: MockProxy<ConfigService> = mock<ConfigService>();
    const databaseUtil: MockProxy<DatabaseUtil> = mock<DatabaseUtil>();
    const helperStringService: MockProxy<HelperStringService> =
        mock<HelperStringService>();
    let queue: TermPolicyQueue;

    beforeEach(async () => {
        vi.resetAllMocks();
        messageService.setMessage.mockImplementation((path: string) => path);
        vi.mocked(configService.get).mockImplementation((key: string) => {
            const values: Record<string, unknown> = {
                'termPolicy.jobId.deleteContentPattern': '{process}-{nonce}',
            };

            return values[key];
        });

        const module: TestingModule = await Test.createTestingModule({
            providers: [
                { provide: MessageService, useValue: messageService },
                TermPolicyQueue,
                {
                    provide: getQueueToken(EnumQueue.termPolicy),
                    useValue: termPolicyQueue,
                },
                { provide: SentryService, useValue: sentryService },
                { provide: ConfigService, useValue: configService },
                { provide: DatabaseUtil, useValue: databaseUtil },
                { provide: HelperStringService, useValue: helperStringService },
            ],
        }).compile();

        queue = module.get(TermPolicyQueue);
    });

    describe('deleteContent', () => {
        it('adds a delete job with the content path under a fresh job id', async () => {
            databaseUtil.createId.mockReturnValue('nonce-1');
            helperStringService.fillPattern.mockReturnValue(
                'deleteContent-nonce-1'
            );

            await queue.deleteContent('term-policies/privacy/1');

            expect(helperStringService.fillPattern).toHaveBeenCalledWith(
                '{process}-{nonce}',
                {
                    process: EnumTermPolicyProcess.deleteContent,
                    nonce: 'nonce-1',
                }
            );
            expect(termPolicyQueue.add).toHaveBeenCalledWith(
                EnumTermPolicyProcess.deleteContent,
                { path: 'term-policies/privacy/1' },
                {
                    priority: EnumQueuePriority.low,
                    jobId: 'deleteContent-nonce-1',
                }
            );
        });

        it('resolves and reports the failure when the add rejects', async () => {
            const error = new Error('redis down');
            termPolicyQueue.add.mockRejectedValue(error);

            await expect(
                queue.deleteContent('term-policies/privacy/1')
            ).resolves.toBeUndefined();

            expect(sentryService.captureException).toHaveBeenCalledWith(
                expect.objectContaining({
                    rawError: error,
                    message: 'termPolicy.queue.error.enqueueDeleteContent',
                })
            );
        });
    });
});
