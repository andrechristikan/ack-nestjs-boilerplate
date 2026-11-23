import { Test } from '@nestjs/testing';
import type { TestingModule } from '@nestjs/testing';
import { getQueueToken } from '@nestjs/bullmq';
import { ConfigService } from '@nestjs/config';
import { mock } from 'vitest-mock-extended';
import type { MockProxy } from 'vitest-mock-extended';
import type { Queue } from 'bullmq';
import { EnumWorkspaceQueue } from '@modules/workspace/enums/workspace.enum';
import { EnumQueuePriority } from '@common/queue/enums/queue.enum';
import { EnumWorkspaceProcess } from '@modules/workspace/enums/workspace.enum';
import { WorkspaceQueue } from '@modules/workspace/queues/workspace.queue';
import { MessageService } from '@common/message/services/message.service';
import type { IActivityLogActorPayload } from '@modules/activity-log/interfaces/activity-log.interface';
import { buildConfigService } from '@test/unit/helpers/test.unit.config.helper';
import { buildRequestContext } from '@test/unit/helpers/test.unit.request.helper';

describe('WorkspaceQueue', () => {
    const messageService: MockProxy<MessageService> = mock<MessageService>();
    let configService: MockProxy<ConfigService>;
    const workspaceQueue: MockProxy<Queue> = mock<Queue>();
    let queue: WorkspaceQueue;

    beforeEach(async () => {
        messageService.setMessage.mockImplementation((path: string) => path);
        configService = buildConfigService({
            'app.timezone': 'UTC',
            'workspace.invite.expirySweepCron': '0 * * * *',
        });

        const module: TestingModule = await Test.createTestingModule({
            providers: [
                { provide: MessageService, useValue: messageService },
                WorkspaceQueue,
                {
                    provide: getQueueToken(EnumWorkspaceQueue.workspace),
                    useValue: workspaceQueue,
                },
                { provide: ConfigService, useValue: configService },
            ],
        }).compile();

        queue = module.get(WorkspaceQueue);
        workspaceQueue.getJobSchedulers.mockResolvedValue([]);
    });

    describe('onModuleInit', () => {
        it('schedules the invite and join-request expiry sweeps', async () => {
            await queue.onModuleInit();

            expect(workspaceQueue.upsertJobScheduler).toHaveBeenCalledTimes(2);
            expect(workspaceQueue.upsertJobScheduler).toHaveBeenCalledWith(
                EnumWorkspaceProcess.expireStaleInvites,
                {
                    pattern: '0 * * * *',
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
            expect(workspaceQueue.upsertJobScheduler).toHaveBeenCalledWith(
                EnumWorkspaceProcess.expireStaleJoinRequests,
                {
                    pattern: '0 * * * *',
                    tz: 'UTC',
                    immediately: true,
                },
                {
                    name: EnumWorkspaceProcess.expireStaleJoinRequests,
                    data: {},
                    opts: {
                        priority: EnumQueuePriority.low,
                    },
                }
            );
        });

        it('rejects when the scheduler upsert rejects', async () => {
            const error = new Error('redis down');
            workspaceQueue.upsertJobScheduler.mockRejectedValue(error);

            await expect(queue.onModuleInit()).rejects.toBe(error);
        });
    });

    describe('softDeleteEffect', () => {
        it('returns the high-priority softDelete effect carrying the workspace id, the actor id, and the activity payload and no business key', () => {
            const activityLog: IActivityLogActorPayload = {
                apiKeyId: 'api-key-1',
                actorUserId: 'user-1',
                workspaceId: 'workspace-1',
                requestLog: buildRequestContext().requestLog,
            };

            const effect = queue.softDeleteEffect(
                'workspace-1',
                'user-1',
                activityLog
            );

            expect(effect).toEqual({
                queue: EnumWorkspaceQueue.workspace,
                name: EnumWorkspaceProcess.softDelete,
                data: {
                    workspaceId: 'workspace-1',
                    deletedBy: 'user-1',
                    activityLog,
                },
                priority: EnumQueuePriority.high,
                idempotencyKey: null,
            });
        });
    });
});
