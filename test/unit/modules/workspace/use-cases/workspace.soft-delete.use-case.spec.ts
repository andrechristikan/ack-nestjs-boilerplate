import { buildActivityLogCreateManyEffect } from '@test/unit/helpers/test.unit.activity-log-effect.helper';
import { ConfigService } from '@nestjs/config';
import { Test } from '@nestjs/testing';
import type { TestingModule } from '@nestjs/testing';
import { mock } from 'vitest-mock-extended';
import type { MockProxy } from 'vitest-mock-extended';
import { AppUnknownException } from '@app/exceptions/app.unknown.exception';
import { DatabaseWriteConflictCode } from '@common/database/constants/database.constant';
import type { IDatabaseTransactionClient } from '@common/database/interfaces/database.client.interface';
import { EnumActivityLogAction } from '@generated/prisma-client/client';

import { ActivityLogQueue } from '@modules/activity-log/queues/activity-log.queue';
import { DatabaseService } from '@common/database/services/database.service';
import { OutboxService } from '@common/outbox/services/outbox.service';
import { ProjectService } from '@modules/project/services/project.service';
import { WorkspaceNotFoundException } from '@modules/workspace/exceptions/workspace.not-found.exception';
import { WorkspaceService } from '@modules/workspace/services/workspace.service';
import { WorkspaceInviteService } from '@modules/workspace/services/workspace.invite.service';
import { WorkspaceJoinRequestService } from '@modules/workspace/services/workspace.join-request.service';
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

describe('WorkspaceSoftDeleteUseCase', () => {
    const workspaceService: MockProxy<WorkspaceService> =
        mock<WorkspaceService>();
    const workspaceInviteService: MockProxy<WorkspaceInviteService> =
        mock<WorkspaceInviteService>();
    const workspaceJoinRequestService: MockProxy<WorkspaceJoinRequestService> =
        mock<WorkspaceJoinRequestService>();
    const projectService: MockProxy<ProjectService> = mock<ProjectService>();
    const activityLogQueue: MockProxy<ActivityLogQueue> =
        mock<ActivityLogQueue>();
    const databaseService: MockProxy<DatabaseService> = mock<DatabaseService>();
    const outboxService: MockProxy<OutboxService> = mock<OutboxService>();
    const firstEntry = buildActivityLogCreateManyEffect('first-entry');
    const secondEntry = buildActivityLogCreateManyEffect('second-entry');
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
        activityLogQueue.recordEffect
            .mockReturnValueOnce(firstEntry)
            .mockReturnValueOnce(secondEntry);
        vi.setSystemTime(deletedAt);
        databaseService.withTransaction.mockImplementation(async fn => fn(tx));

        const module: TestingModule = await Test.createTestingModule({
            providers: [
                WorkspaceSoftDeleteUseCase,
                { provide: WorkspaceService, useValue: workspaceService },
                {
                    provide: WorkspaceInviteService,
                    useValue: workspaceInviteService,
                },
                {
                    provide: WorkspaceJoinRequestService,
                    useValue: workspaceJoinRequestService,
                },
                { provide: ProjectService, useValue: projectService },
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
        it('soft-deletes the workspace, its projects, its pending invites, and its pending join requests in order on one transaction and adds the deleted entry on it', async () => {
            const callOrder: string[] = [];
            workspaceService.softDeleteInTx.mockImplementation(async () => {
                callOrder.push('workspace');
            });
            projectService.softDeleteByWorkspaceInTx.mockImplementation(
                async () => {
                    callOrder.push('projects');
                }
            );
            workspaceInviteService.revokePendingByWorkspaceInTx.mockImplementation(
                async () => {
                    callOrder.push('invites');
                }
            );
            workspaceJoinRequestService.cancelPendingByWorkspaceInTx.mockImplementation(
                async () => {
                    callOrder.push('joinRequests');
                }
            );
            outboxService.addInTx.mockImplementation(async () => {
                callOrder.push('addEntry');

                return 'outbox-1';
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
                projectService.softDeleteByWorkspaceInTx
            ).toHaveBeenCalledWith(tx, 'workspace-1', deletedAt, 'user-1');
            expect(
                workspaceInviteService.revokePendingByWorkspaceInTx
            ).toHaveBeenCalledWith(tx, 'workspace-1');
            expect(
                workspaceJoinRequestService.cancelPendingByWorkspaceInTx
            ).toHaveBeenCalledWith(tx, 'workspace-1');
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
            expect(outboxService.addInTx).toHaveBeenCalledWith(tx, firstEntry);
            expect(callOrder).toEqual([
                'workspace',
                'projects',
                'invites',
                'joinRequests',
                'addEntry',
            ]);
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
            ).rejects.toBeInstanceOf(WorkspaceNotFoundException);
            expect(databaseService.withTransaction).toHaveBeenCalledTimes(1);
            expect(
                projectService.softDeleteByWorkspaceInTx
            ).not.toHaveBeenCalled();
            expect(
                workspaceInviteService.revokePendingByWorkspaceInTx
            ).not.toHaveBeenCalled();
            expect(
                workspaceJoinRequestService.cancelPendingByWorkspaceInTx
            ).not.toHaveBeenCalled();
            expect(outboxService.addInTx).not.toHaveBeenCalled();
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
            ).rejects.toBeInstanceOf(WorkspaceNotFoundException);
            expect(outboxService.addInTx).not.toHaveBeenCalled();
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
            ).rejects.toBeInstanceOf(AppUnknownException);
            expect(outboxService.addInTx).not.toHaveBeenCalled();
        });
    });
});
