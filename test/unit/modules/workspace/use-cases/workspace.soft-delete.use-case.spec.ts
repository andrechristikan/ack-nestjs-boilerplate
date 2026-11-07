import { ConfigService } from '@nestjs/config';
import { Test } from '@nestjs/testing';
import type { TestingModule } from '@nestjs/testing';
import { mock } from 'vitest-mock-extended';
import type { MockProxy } from 'vitest-mock-extended';
import { AppUnknownException } from '@app/exceptions/app.unknown.exception';
import { DatabaseWriteConflictException } from '@common/database/exceptions/database.write-conflict.exception';
import type { IDatabaseTransactionClient } from '@common/database/interfaces/database.client.interface';
import { DatabaseService } from '@common/database/services/database.service';
import { DatabaseUtil } from '@common/database/utils/database.util';
import { HelperDateService } from '@common/helper/services/helper.date.service';
import { EnumActivityLogAction } from '@generated/prisma-client/client';

import { ActivityLogService } from '@modules/activity-log/services/activity-log.service';
import type { IActivityLogStaged } from '@modules/activity-log/interfaces/activity-log.interface';
import { ProjectService } from '@modules/project/services/project.service';
import { WorkspaceNotFoundException } from '@modules/workspace/exceptions/workspace.not-found.exception';
import { WorkspaceService } from '@modules/workspace/services/workspace.service';
import { WorkspaceInviteService } from '@modules/workspace/services/workspace.invite.service';
import { WorkspaceJoinRequestService } from '@modules/workspace/services/workspace.join-request.service';
import { buildConfigService } from '@test/unit/helpers/test.unit.config.helper';
import { WorkspaceSoftDeleteUseCase } from '@modules/workspace/use-cases/workspace.soft-delete.use-case';

describe('WorkspaceSoftDeleteUseCase', () => {
    const workspaceService: MockProxy<WorkspaceService> =
        mock<WorkspaceService>();
    const workspaceInviteService: MockProxy<WorkspaceInviteService> =
        mock<WorkspaceInviteService>();
    const workspaceJoinRequestService: MockProxy<WorkspaceJoinRequestService> =
        mock<WorkspaceJoinRequestService>();
    const projectService: MockProxy<ProjectService> = mock<ProjectService>();
    const activityLogService: MockProxy<ActivityLogService> =
        mock<ActivityLogService>();
    const databaseService: MockProxy<DatabaseService> = mock<DatabaseService>();
    const databaseUtil: MockProxy<DatabaseUtil> = mock<DatabaseUtil>();
    const helperDateService: MockProxy<HelperDateService> =
        mock<HelperDateService>();
    const configValues: Record<string, unknown> = {
        'workspace.delete.timeoutInMs': 10000,
    };
    const tx: IDatabaseTransactionClient = mock<IDatabaseTransactionClient>();
    const deletedAt = new Date('2026-01-01T00:00:00.000Z');
    const stagedActivityLog: IActivityLogStaged = {
        action: EnumActivityLogAction.workspaceCreated,
        metadata: {},
        userId: null,
        createdBy: null,
        workspaceId: null,
    };
    let useCase: WorkspaceSoftDeleteUseCase;

    beforeEach(async () => {
        vi.resetAllMocks();
        activityLogService.prepare.mockReturnValue(stagedActivityLog);
        helperDateService.create.mockReturnValue(deletedAt);
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
                { provide: HelperDateService, useValue: helperDateService },
                { provide: ActivityLogService, useValue: activityLogService },
                { provide: DatabaseUtil, useValue: databaseUtil },
                {
                    provide: ConfigService,
                    useValue: buildConfigService(configValues),
                },
            ],
        }).compile();

        useCase = module.get(WorkspaceSoftDeleteUseCase);
    });

    describe('execute', () => {
        it('prepares the deleted activity, soft-deletes the workspace, its projects, its pending invites, and its pending join requests in order on one transaction, and stages it', async () => {
            const callOrder: string[] = [];
            activityLogService.prepare.mockImplementation(() => {
                callOrder.push('prepare');

                return stagedActivityLog;
            });
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
            activityLogService.stagePrepared.mockImplementation(() => {
                callOrder.push('stage');
            });

            const result = await useCase.execute('workspace-1', 'user-1');

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
            expect(activityLogService.prepare).toHaveBeenCalledWith({
                action: EnumActivityLogAction.workspaceDeleted,
                userId: 'user-1',
                createdBy: 'user-1',
                workspaceId: 'workspace-1',
            });
            expect(callOrder).toEqual([
                'prepare',
                'workspace',
                'projects',
                'invites',
                'joinRequests',
                'stage',
            ]);
        });

        it('runs no later step and stages nothing when the workspace soft delete rejects', async () => {
            workspaceService.softDeleteInTx.mockRejectedValue(
                new WorkspaceNotFoundException()
            );

            await expect(
                useCase.execute('workspace-1', 'user-1')
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
            expect(activityLogService.stagePrepared).not.toHaveBeenCalled();
        });

        it('opens the transaction with workspace.delete.timeoutInMs', async () => {
            await useCase.execute('workspace-1', 'user-1');

            expect(databaseService.withTransaction).toHaveBeenCalledWith(
                expect.any(Function),
                { timeout: 10000 }
            );
        });

        it('answers WorkspaceNotFoundException on a write conflict and stages no row', async () => {
            const conflict = new Error('conflict');
            workspaceService.softDeleteInTx.mockRejectedValue(conflict);
            databaseUtil.toException.mockReturnValue(
                new DatabaseWriteConflictException()
            );

            await expect(
                useCase.execute('workspace-1', 'user-1')
            ).rejects.toBeInstanceOf(WorkspaceNotFoundException);
            expect(databaseUtil.toException).toHaveBeenCalledWith(conflict);
            expect(activityLogService.stagePrepared).not.toHaveBeenCalled();
        });

        it('wraps an unknown error', async () => {
            workspaceService.softDeleteInTx.mockRejectedValue(
                new Error('boom')
            );
            databaseUtil.toException.mockReturnValue(null);

            await expect(
                useCase.execute('workspace-1', 'user-1')
            ).rejects.toBeInstanceOf(AppUnknownException);
            expect(activityLogService.stagePrepared).not.toHaveBeenCalled();
        });
    });
});
