import { Test } from '@nestjs/testing';
import type { TestingModule } from '@nestjs/testing';
import { mock } from 'vitest-mock-extended';
import type { MockProxy } from 'vitest-mock-extended';
import type { IDatabaseTransactionClient } from '@common/database/interfaces/database.client.interface';
import { DatabaseService } from '@common/database/services/database.service';
import { OutboxService } from '@common/outbox/services/outbox.service';
import { EnumQueuePriority } from '@common/queue/enums/queue.enum';
import { ActivityLogQueue } from '@modules/activity-log/queues/activity-log.queue';
import type { IActivityLogActorPayload } from '@modules/activity-log/interfaces/activity-log.interface';
import {
    EnumWorkspaceProcess,
    EnumWorkspaceQueue,
} from '@modules/workspace/enums/workspace.enum';
import type { IWorkspaceSoftDeleteEffect } from '@modules/workspace/interfaces/workspace.interface';
import { WorkspaceQueue } from '@modules/workspace/queues/workspace.queue';
import { WorkspaceSoftDeleteUseCase } from '@modules/workspace/use-cases/workspace.soft-delete.use-case';
import {
    buildApiKeyContext,
    buildAuthJwtAccessContext,
    buildRequestContext,
    buildUser,
    buildUserContext,
    buildWorkspace,
    buildWorkspaceContext,
    buildWorkspaceMember,
} from '@test/unit/helpers/test.unit.request.helper';

describe('WorkspaceSoftDeleteUseCase', () => {
    const workspaceQueue: MockProxy<WorkspaceQueue> = mock<WorkspaceQueue>();
    const activityLogQueue: MockProxy<ActivityLogQueue> =
        mock<ActivityLogQueue>();
    const databaseService: MockProxy<DatabaseService> = mock<DatabaseService>();
    const outboxService: MockProxy<OutboxService> = mock<OutboxService>();
    const tx: IDatabaseTransactionClient = mock<IDatabaseTransactionClient>();
    const requestContext = buildRequestContext();
    const apiKeyContext = buildApiKeyContext();
    const userContext = buildUserContext(
        buildUser('user-1', 'jane@example.com')
    );
    const authContext = buildAuthJwtAccessContext(userContext.user.id);
    const workspaceContext = buildWorkspaceContext(
        buildWorkspace(),
        buildWorkspaceMember('user-1')
    );
    const activityLog: IActivityLogActorPayload = {
        apiKeyId: apiKeyContext.apiKey.id,
        actorUserId: 'user-1',
        workspaceId: 'workspace-1',
        requestLog: requestContext.requestLog,
    };
    const effect: IWorkspaceSoftDeleteEffect = {
        queue: EnumWorkspaceQueue.workspace,
        name: EnumWorkspaceProcess.softDelete,
        data: {
            workspaceId: 'workspace-1',
            deletedBy: 'user-1',
            activityLog,
        },
        priority: EnumQueuePriority.high,
        idempotencyKey: null,
    };

    let useCase: WorkspaceSoftDeleteUseCase;

    beforeEach(async () => {
        databaseService.withTransaction.mockImplementation(async fn => fn(tx));
        outboxService.addInTx.mockResolvedValue('outbox-1');
        activityLogQueue.toPayload.mockReturnValue(activityLog);
        workspaceQueue.softDeleteEffect.mockReturnValue(effect);

        const module: TestingModule = await Test.createTestingModule({
            providers: [
                WorkspaceSoftDeleteUseCase,
                { provide: WorkspaceQueue, useValue: workspaceQueue },
                { provide: ActivityLogQueue, useValue: activityLogQueue },
                { provide: DatabaseService, useValue: databaseService },
                { provide: OutboxService, useValue: outboxService },
            ],
        }).compile();

        useCase = module.get(WorkspaceSoftDeleteUseCase);
    });

    describe('execute', () => {
        it('adds the softDelete effect on the transaction and returns its outbox id', async () => {
            const result = await useCase.execute(
                requestContext,
                apiKeyContext,
                authContext,
                workspaceContext
            );

            expect(result).toEqual({ data: { outboxId: 'outbox-1' } });
            expect(databaseService.withTransaction).toHaveBeenCalledTimes(1);
            expect(databaseService.withTransaction).toHaveBeenCalledWith(
                expect.any(Function)
            );
            expect(outboxService.addInTx).toHaveBeenCalledTimes(1);
            expect(outboxService.addInTx).toHaveBeenCalledWith(tx, effect);
        });

        it('builds the effect from the workspace id, the actor id, and the activity payload of the four contexts', async () => {
            await useCase.execute(
                requestContext,
                apiKeyContext,
                authContext,
                workspaceContext
            );

            expect(activityLogQueue.toPayload).toHaveBeenCalledWith(
                requestContext,
                apiKeyContext,
                authContext,
                workspaceContext
            );
            expect(workspaceQueue.softDeleteEffect).toHaveBeenCalledWith(
                'workspace-1',
                'user-1',
                activityLog
            );
        });
    });
});
