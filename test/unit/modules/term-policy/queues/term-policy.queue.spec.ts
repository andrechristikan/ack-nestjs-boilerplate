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
import { EnumTermPolicyQueue } from '@modules/term-policy/enums/term-policy.enum';
import { EnumQueuePriority } from '@queues/enums/queue.enum';
import { EnumTermPolicyProcess } from '@modules/term-policy/enums/term-policy.enum';
import { TermPolicyQueue } from '@modules/term-policy/queues/term-policy.queue';
import type { ITermPolicyCopyContentPayload } from '@modules/term-policy/interfaces/term-policy.interface';
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
                'termPolicy.jobId.copyContentPattern':
                    '{process}-{termPolicyId}',
            };

            return values[key];
        });

        const module: TestingModule = await Test.createTestingModule({
            providers: [
                { provide: MessageService, useValue: messageService },
                TermPolicyQueue,
                {
                    provide: getQueueToken(EnumTermPolicyQueue.termPolicy),
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

    describe('copyContent', () => {
        const payload: ITermPolicyCopyContentPayload = {
            termPolicyId: 'term-policy-1',
            contents: [],
            destination: 'public/term-policies/privacy/1',
        };

        it('adds a copy job under a job id per term policy', async () => {
            helperStringService.fillPattern.mockReturnValue(
                'copyContent-term-policy-1'
            );

            await queue.copyContent(payload);

            expect(helperStringService.fillPattern).toHaveBeenCalledWith(
                '{process}-{termPolicyId}',
                {
                    process: EnumTermPolicyProcess.copyContent,
                    termPolicyId: 'term-policy-1',
                }
            );
            expect(termPolicyQueue.add).toHaveBeenCalledWith(
                EnumTermPolicyProcess.copyContent,
                payload,
                {
                    priority: EnumQueuePriority.high,
                    jobId: 'copyContent-term-policy-1',
                }
            );
        });

        it('resolves and reports the failure when the add rejects', async () => {
            const error = new Error('redis down');
            termPolicyQueue.add.mockRejectedValue(error);

            await expect(queue.copyContent(payload)).resolves.toBeUndefined();

            expect(sentryService.captureException).toHaveBeenCalledWith(
                expect.objectContaining({
                    rawError: error,
                    message: 'termPolicy.queue.error.enqueueCopyContent',
                })
            );
        });
    });
});
