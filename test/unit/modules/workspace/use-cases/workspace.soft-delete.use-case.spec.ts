import { buildActivityLogCreateManyEffect } from '@test/unit/helpers/test.unit.activity-log-effect.helper';
import { ConfigService } from '@nestjs/config';
import { Test } from '@nestjs/testing';
import type { TestingModule } from '@nestjs/testing';
import { mock } from 'vitest-mock-extended';
import type { MockProxy } from 'vitest-mock-extended';
import { DatabaseWriteConflictCode } from '@common/database/constants/database.constant';
import type { IDatabaseTransactionClient } from '@common/database/interfaces/database.client.interface';
import { EnumActivityLogAction } from '@generated/prisma-client/client';

import { ActivityLogQueue } from '@modules/activity-log/queues/activity-log.queue';
import { DatabaseService } from '@common/database/services/database.service';
import { OutboxService } from '@common/outbox/services/outbox.service';
import {
    EnumProjectProcess,
    EnumProjectQueue,
} from '@modules/project/enums/project.enum';
import type { IProjectSoftDeleteByWorkspaceEffect } from '@modules/project/interfaces/project.interface';
import { ProjectQueue } from '@modules/project/queues/project.queue';
import { EnumQueuePriority } from '@common/queue/enums/queue.enum';
import { WorkspaceNotFoundException } from '@modules/workspace/exceptions/workspace.not-found.exception';
import { WorkspaceService } from '@modules/workspace/services/workspace.service';
import { buildConfigService } from '@test/unit/helpers/test.unit.config.helper';
import {
    TestUnitKitConfigValues,
    TestUnitKitProviders,
} from '@test/unit/helpers/test.unit.kit.helper';
import { buildPrismaKnownRequestError } from '@test/unit/helpers/test.unit.database.helper';
import { WorkspaceSoftDeleteUseCase } from '@modules/workspace/use-cases/workspace.soft-delete.use-case';
import {
    buildUser,
    buildWorkspace,
    buildWorkspaceMember,
    buildRequestContext,
    buildApiKeyContext,
    buildUserContext,
    buildAuthJwtAccessContext,
    buildWorkspaceContext,
} from '@test/unit/helpers/test.unit.request.helper';
import { EnumAppStatusCodeError } from '@app/enums/app.status-code.enum';
import { EnumWorkspaceStatusCodeError } from '@modules/workspace/enums/workspace.status-code.enum';

describe('WorkspaceSoftDeleteUseCase', () => {
    const workspaceService: MockProxy<WorkspaceService> =
        mock<WorkspaceService>();
    const projectQueue: MockProxy<ProjectQueue> = mock<ProjectQueue>();
    const activityLogQueue: MockProxy<ActivityLogQueue> =
        mock<ActivityLogQueue>();
    const databaseService: MockProxy<DatabaseService> = mock<DatabaseService>();
    const outboxService: MockProxy<OutboxService> = mock<OutboxService>();
    const entry = buildActivityLogCreateManyEffect('first-entry');
    const projectEffect: IProjectSoftDeleteByWorkspaceEffect = {
        queue: EnumProjectQueue.project,
        name: EnumProjectProcess.softDeleteByWorkspace,
        data: {
            workspaceId: 'workspace-1',
            deletedAt: '2026-01-01T00:00:00.000Z',
            deletedBy: 'user-1',
        },
        priority: EnumQueuePriority.high,
        idempotencyKey: null,
    };
    const configValues: Record<string, unknown> = {
        'workspace.delete.timeoutInMs': 10000,
    };
    const tx: IDatabaseTransactionClient = mock<IDatabaseTransactionClient>();
    const deletedAt = new Date('2026-01-01T00:00:00.000Z');
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

    let useCase: WorkspaceSoftDeleteUseCase;

    beforeAll(() => {
        vi.useFakeTimers();
    });

    beforeEach(async () => {
        activityLogQueue.recordEffect.mockReturnValue(entry);
        projectQueue.softDeleteByWorkspaceEffect.mockReturnValue(projectEffect);
        vi.setSystemTime(deletedAt);
        databaseService.withTransaction.mockImplementation(async fn => fn(tx));

        const module: TestingModule = await Test.createTestingModule({
            providers: [
                WorkspaceSoftDeleteUseCase,
                { provide: WorkspaceService, useValue: workspaceService },
                { provide: ProjectQueue, useValue: projectQueue },
                { provide: DatabaseService, useValue: databaseService },
                { provide: OutboxService, useValue: outboxService },
                ...TestUnitKitProviders,
                { provide: ActivityLogQueue, useValue: activityLogQueue },
                {
                    provide: ConfigService,
                    useValue: buildConfigService({
                        ...TestUnitKitConfigValues,
                        ...configValues,
                    }),
                },
            ],
        }).compile();

        useCase = module.get(WorkspaceSoftDeleteUseCase);
    });

    afterAll(() => {
        vi.useRealTimers();
    });

    describe('execute', () => {
        it('soft-deletes the workspace and adds the project cascade effect with the deleted entry in one add on one transaction', async () => {
            const callOrder: string[] = [];
            workspaceService.softDeleteInTx.mockImplementation(async () => {
                callOrder.push('workspace');
            });
            outboxService.addManyInTx.mockImplementation(async () => {
                callOrder.push('addEffects');

                return ['outbox-1', 'outbox-2'];
            });

            const result = await useCase.execute(
                requestContext,
                apiKeyContext,
                authContext,
                workspaceContext
            );

            expect(result).toEqual({});
            expect(databaseService.withTransaction).toHaveBeenCalledTimes(1);
            expect(workspaceService.softDeleteInTx).toHaveBeenCalledWith(
                tx,
                'workspace-1',
                deletedAt,
                'user-1'
            );
            expect(
                projectQueue.softDeleteByWorkspaceEffect
            ).toHaveBeenCalledWith('workspace-1', deletedAt, 'user-1');
            expect(activityLogQueue.recordEffect).toHaveBeenCalledWith(
                requestContext,
                apiKeyContext,
                authContext,
                workspaceContext,
                {
                    action: EnumActivityLogAction.workspaceDeleted,
                    userId: 'user-1',
                    createdBy: 'user-1',
                    workspaceId: 'workspace-1',
                }
            );
            expect(outboxService.addManyInTx).toHaveBeenCalledTimes(1);
            expect(outboxService.addManyInTx).toHaveBeenCalledWith(tx, [
                projectEffect,
                entry,
            ]);
            expect(callOrder).toEqual(['workspace', 'addEffects']);
        });

        it('runs no later step and stages nothing when the workspace soft delete rejects', async () => {
            workspaceService.softDeleteInTx.mockRejectedValue(
                new WorkspaceNotFoundException()
            );

            await expect(
                useCase.execute(
                    requestContext,
                    apiKeyContext,
                    authContext,
                    workspaceContext
                )
            ).rejects.toMatchObject({
                module: 'workspace',
                statusCode: EnumWorkspaceStatusCodeError.notFound,
            });
            expect(databaseService.withTransaction).toHaveBeenCalledTimes(1);
            expect(outboxService.addManyInTx).not.toHaveBeenCalled();
        });

        it('opens the transaction with workspace.delete.timeoutInMs', async () => {
            await useCase.execute(
                requestContext,
                apiKeyContext,
                authContext,
                workspaceContext
            );

            expect(databaseService.withTransaction).toHaveBeenCalledWith(
                expect.any(Function),
                { timeout: 10000 }
            );
        });

        it('answers WorkspaceNotFoundException on a write conflict and stages no row', async () => {
            const conflict = buildPrismaKnownRequestError(
                DatabaseWriteConflictCode
            );
            workspaceService.softDeleteInTx.mockRejectedValue(conflict);

            await expect(
                useCase.execute(
                    requestContext,
                    apiKeyContext,
                    authContext,
                    workspaceContext
                )
            ).rejects.toMatchObject({
                module: 'workspace',
                statusCode: EnumWorkspaceStatusCodeError.notFound,
            });
            expect(outboxService.addManyInTx).not.toHaveBeenCalled();
        });

        it('wraps an unknown error', async () => {
            workspaceService.softDeleteInTx.mockRejectedValue(
                new Error('boom')
            );

            await expect(
                useCase.execute(
                    requestContext,
                    apiKeyContext,
                    authContext,
                    workspaceContext
                )
            ).rejects.toMatchObject({
                module: 'app',
                statusCode: EnumAppStatusCodeError.unknown,
            });
            expect(outboxService.addManyInTx).not.toHaveBeenCalled();
        });
    });
});
