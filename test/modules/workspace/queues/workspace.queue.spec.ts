import { Test } from '@nestjs/testing';
import type { TestingModule } from '@nestjs/testing';
import { getQueueToken } from '@nestjs/bullmq';
import { ConfigService } from '@nestjs/config';
import { mock } from 'vitest-mock-extended';
import type { MockProxy } from 'vitest-mock-extended';
import type { Queue } from 'bullmq';
import { EnumQueue, EnumQueuePriority } from '@queues/enums/queue.enum';
import { EnumWorkspaceProcess } from '@modules/workspace/enums/workspace.enum';
import { WorkspaceQueue } from '@modules/workspace/queues/workspace.queue';

describe('WorkspaceQueue', () => {
    const configGet = vi.fn<(key: string) => unknown>();
    const configService: MockProxy<ConfigService> = mock<ConfigService>({
        get: configGet as ConfigService['get'],
    });
    const queue: MockProxy<Queue> = mock<Queue>();
    let workspaceQueue: WorkspaceQueue;

    beforeEach(async () => {
        vi.resetAllMocks();
        configGet.mockImplementation((key: string) => {
            const values: Record<string, string> = {
                'app.timezone': 'UTC',
                'workspace.invite.expirySweepCron': '0 0 * * *',
            };

            return values[key];
        });

        const module: TestingModule = await Test.createTestingModule({
            providers: [
                WorkspaceQueue,
                {
                    provide: getQueueToken(EnumQueue.workspace),
                    useValue: queue,
                },
                { provide: ConfigService, useValue: configService },
            ],
        }).compile();

        workspaceQueue = module.get(WorkspaceQueue);
    });

    describe('scheduleInviteExpirySweep', () => {
        it('schedules the daily expiry-sweep job', async () => {
            await workspaceQueue.scheduleInviteExpirySweep();

            expect(queue.upsertJobScheduler).toHaveBeenCalledWith(
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
    });
});
