import { Test } from '@nestjs/testing';
import type { TestingModule } from '@nestjs/testing';
import { getQueueToken } from '@nestjs/bullmq';
import { ConfigService } from '@nestjs/config';
import { mock } from 'vitest-mock-extended';
import type { MockProxy } from 'vitest-mock-extended';
import type { Queue } from 'bullmq';
import { SentryService } from '@common/sentry/services/sentry.service';
import { EnumQueue, EnumQueuePriority } from '@queues/enums/queue.enum';
import { EnumWorkspaceProcess } from '@modules/workspace/enums/workspace.enum';
import { WorkspaceQueue } from '@modules/workspace/queues/workspace.queue';
import { MessageService } from '@common/message/services/message.service';

describe('WorkspaceQueue', () => {
    const messageService: MockProxy<MessageService> = mock<MessageService>();
    const configGet = vi.fn<(key: string) => unknown>();
    const configService: MockProxy<ConfigService> = mock<ConfigService>({
        get: configGet as ConfigService['get'],
    });
    const workspaceQueue: MockProxy<Queue> = mock<Queue>();
    const sentryService: MockProxy<SentryService> = mock<SentryService>();
    let queue: WorkspaceQueue;

    beforeEach(async () => {
        vi.resetAllMocks();
        messageService.setMessage.mockImplementation((path: string) => path);
        configGet.mockImplementation((key: string) => {
            const values: Record<string, string> = {
                'app.timezone': 'UTC',
                'workspace.invite.expirySweepCron': '0 0 * * *',
            };

            return values[key];
        });

        const module: TestingModule = await Test.createTestingModule({
            providers: [
                { provide: MessageService, useValue: messageService },
                WorkspaceQueue,
                {
                    provide: getQueueToken(EnumQueue.workspace),
                    useValue: workspaceQueue,
                },
                { provide: SentryService, useValue: sentryService },
                { provide: ConfigService, useValue: configService },
            ],
        }).compile();

        queue = module.get(WorkspaceQueue);
    });

    describe('scheduleInviteExpirySweep', () => {
        it('schedules the daily expiry-sweep job', async () => {
            await queue.scheduleInviteExpirySweep();

            expect(workspaceQueue.upsertJobScheduler).toHaveBeenCalledWith(
                EnumWorkspaceProcess.expireStaleInvites,
                {
                    pattern: '0 0 * * *',
                    tz: 'UTC',
                    immediately: true,
                },
                {
                    name: EnumWorkspaceProcess.expireStaleInvites,
                    data: {},
                    opts: {
                        priority: EnumQueuePriority.low,
                    },
                }
            );
        });

        it('rejects and reports nothing when the scheduler upsert rejects', async () => {
            const error = new Error('redis down');
            workspaceQueue.upsertJobScheduler.mockRejectedValue(error);

            await expect(queue.scheduleInviteExpirySweep()).rejects.toBe(error);

            expect(sentryService.captureException).not.toHaveBeenCalled();
        });
    });
});
