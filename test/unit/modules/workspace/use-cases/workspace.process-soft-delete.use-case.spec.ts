import { ConfigService } from '@nestjs/config';
import { Test } from '@nestjs/testing';
import type { TestingModule } from '@nestjs/testing';
import { mock } from 'vitest-mock-extended';
import type { MockProxy } from 'vitest-mock-extended';
import { EnumActivityLogAction } from '@generated/prisma-client/client';
import type { IDatabaseTransactionClient } from '@common/database/interfaces/database.client.interface';
import { DatabaseService } from '@common/database/services/database.service';
import { HelperDateService } from '@common/helper/services/helper.date.service';
import { MessageService } from '@common/message/services/message.service';
import { OutboxService } from '@common/outbox/services/outbox.service';
import { EnumQueuePriority } from '@common/queue/enums/queue.enum';
import { QueueException } from '@common/queue/exceptions/queue.exception';
import {
    EnumActivityLogProcess,
    EnumActivityLogQueue,
} from '@modules/activity-log/enums/activity-log.enum';
import type {
    IActivityLogActorPayload,
    IActivityLogCreateManyEffect,
} from '@modules/activity-log/interfaces/activity-log.interface';
import { ActivityLogQueue } from '@modules/activity-log/queues/activity-log.queue';
import { ProjectService } from '@modules/project/services/project.service';
import { WorkspaceNotFoundException } from '@modules/workspace/exceptions/workspace.not-found.exception';
import type { IWorkspaceSoftDeletePayload } from '@modules/workspace/interfaces/workspace.interface';
import { WorkspaceService } from '@modules/workspace/services/workspace.service';
import { WorkspaceProcessSoftDeleteUseCase } from '@modules/workspace/use-cases/workspace.process-soft-delete.use-case';
import { buildConfigService } from '@test/unit/helpers/test.unit.config.helper';
import { buildRequestLog } from '@test/unit/helpers/test.unit.request.helper';

describe('WorkspaceProcessSoftDeleteUseCase', () => {
    const workspaceService: MockProxy<WorkspaceService> =
        mock<WorkspaceService>();
    const projectService: MockProxy<ProjectService> = mock<ProjectService>();
    const activityLogQueue: MockProxy<ActivityLogQueue> =
        mock<ActivityLogQueue>();
    const databaseService: MockProxy<DatabaseService> = mock<DatabaseService>();
    const outboxService: MockProxy<OutboxService> = mock<OutboxService>();
    const messageService: MockProxy<MessageService> = mock<MessageService>();
    const tx: IDatabaseTransactionClient = mock<IDatabaseTransactionClient>();
    const deletedAt = new Date('2026-01-01T00:00:00.000Z');
    const activityLog: IActivityLogActorPayload = {
        apiKeyId: 'api-key-1',
        actorUserId: 'user-1',
        workspaceId: 'workspace-1',
        requestLog: buildRequestLog(),
    };
    const payload: IWorkspaceSoftDeletePayload = {
        workspaceId: 'workspace-1',
        deletedBy: 'user-1',
        activityLog,
    };
    const entry: IActivityLogCreateManyEffect = {
        queue: EnumActivityLogQueue.activityLog,
        name: EnumActivityLogProcess.createMany,
        data: { rows: [] },
        priority: EnumQueuePriority.low,
        idempotencyKey: null,
    };

    let useCase: WorkspaceProcessSoftDeleteUseCase;

    beforeAll(() => {
        vi.useFakeTimers();
    });

    afterAll(() => {
        vi.useRealTimers();
    });

    beforeEach(async () => {
        vi.setSystemTime(deletedAt);
        databaseService.withTransaction.mockImplementation(
            async fn => fn(tx) as never
        );
        messageService.setMessage.mockImplementation((path: string) => path);
        workspaceService.softDeleteManyInTx.mockResolvedValue(['workspace-1']);
        projectService.softDeleteChunkByWorkspaces.mockResolvedValue(0);
        activityLogQueue.recordEffectFromPayload.mockReturnValue(entry);

        const module: TestingModule = await Test.createTestingModule({
            providers: [
                WorkspaceProcessSoftDeleteUseCase,
                HelperDateService,
                { provide: WorkspaceService, useValue: workspaceService },
                { provide: ProjectService, useValue: projectService },
                { provide: ActivityLogQueue, useValue: activityLogQueue },
                { provide: DatabaseService, useValue: databaseService },
                { provide: OutboxService, useValue: outboxService },
                { provide: MessageService, useValue: messageService },
                {
                    provide: ConfigService,
                    useValue: buildConfigService({
                        'app.timezone': 'UTC',
                        'workspace.delete.timeoutInMs': 10000,
                    }),
                },
            ],
        }).compile();

        useCase = module.get(WorkspaceProcessSoftDeleteUseCase);
    });

    describe('execute', () => {
        it('soft-deletes the workspace and adds the deleted entry on one transaction opened with workspace.delete.timeoutInMs', async () => {
            const result = await useCase.execute(payload);

            expect(result).toEqual({ message: 'workspace.queue.softDelete' });
            expect(databaseService.withTransaction).toHaveBeenCalledTimes(1);
            expect(databaseService.withTransaction).toHaveBeenCalledWith(
                expect.any(Function),
                { timeout: 10000 }
            );
            expect(workspaceService.softDeleteManyInTx).toHaveBeenCalledWith(
                tx,
                ['workspace-1'],
                deletedAt,
                'user-1'
            );
            expect(
                activityLogQueue.recordEffectFromPayload
            ).toHaveBeenCalledWith(activityLog, {
                action: EnumActivityLogAction.workspaceDeleted,
                userId: 'user-1',
                createdBy: 'user-1',
                workspaceId: 'workspace-1',
            });
            expect(outboxService.addInTx).toHaveBeenCalledTimes(1);
            expect(outboxService.addInTx).toHaveBeenCalledWith(tx, entry);
        });

        it('adds no entry when the workspace was already deleted', async () => {
            workspaceService.softDeleteManyInTx.mockResolvedValue([]);

            const result = await useCase.execute(payload);

            expect(result).toEqual({ message: 'workspace.queue.softDelete' });
            expect(outboxService.addInTx).not.toHaveBeenCalled();
            expect(
                activityLogQueue.recordEffectFromPayload
            ).not.toHaveBeenCalled();
        });

        it('deletes the projects chunk by chunk after the commit until a chunk returns 0', async () => {
            const callOrder: string[] = [];
            databaseService.withTransaction.mockImplementation(async fn => {
                callOrder.push('transaction:start');
                await fn(tx);
                callOrder.push('transaction:commit');

                return undefined as never;
            });
            projectService.softDeleteChunkByWorkspaces
                .mockImplementationOnce(async () => {
                    callOrder.push('chunk');

                    return 100;
                })
                .mockImplementationOnce(async () => {
                    callOrder.push('chunk');

                    return 40;
                })
                .mockImplementationOnce(async () => {
                    callOrder.push('chunk');

                    return 0;
                });

            await useCase.execute(payload);

            expect(
                projectService.softDeleteChunkByWorkspaces
            ).toHaveBeenCalledTimes(3);
            expect(
                projectService.softDeleteChunkByWorkspaces
            ).toHaveBeenCalledWith(['workspace-1'], deletedAt, 'user-1');
            expect(callOrder).toEqual([
                'transaction:start',
                'transaction:commit',
                'chunk',
                'chunk',
                'chunk',
            ]);
        });

        it('still pages the projects when the workspace was already deleted', async () => {
            workspaceService.softDeleteManyInTx.mockResolvedValue([]);
            projectService.softDeleteChunkByWorkspaces
                .mockResolvedValueOnce(25)
                .mockResolvedValueOnce(0);

            await useCase.execute(payload);

            expect(
                projectService.softDeleteChunkByWorkspaces
            ).toHaveBeenCalledTimes(2);
        });

        it('rethrows an AppBaseException as it came and pages no project', async () => {
            const failure = new WorkspaceNotFoundException();
            workspaceService.softDeleteManyInTx.mockRejectedValue(failure);

            await expect(useCase.execute(payload)).rejects.toBe(failure);
            expect(
                projectService.softDeleteChunkByWorkspaces
            ).not.toHaveBeenCalled();
        });

        it('rethrows a QueueException as it came', async () => {
            const failure = new QueueException('chunk failed', false);
            projectService.softDeleteChunkByWorkspaces.mockRejectedValue(
                failure
            );

            await expect(useCase.execute(payload)).rejects.toBe(failure);
        });

        it('wraps an unknown error in a fatal QueueException carrying the cause', async () => {
            const cause = new Error('boom');
            workspaceService.softDeleteManyInTx.mockRejectedValue(cause);

            const rejection = useCase.execute(payload);

            await expect(rejection).rejects.toMatchObject({
                constructor: QueueException,
                message: 'workspace.queue.error.softDelete',
                isFatal: true,
                rawError: cause,
            });
        });

        it('wraps an unknown error a project chunk throws in a fatal QueueException', async () => {
            const cause = new Error('mongo down');
            projectService.softDeleteChunkByWorkspaces.mockRejectedValue(cause);

            const rejection = useCase.execute(payload);

            await expect(rejection).rejects.toMatchObject({
                constructor: QueueException,
                message: 'workspace.queue.error.softDelete',
                isFatal: true,
                rawError: cause,
            });
        });
    });
});
