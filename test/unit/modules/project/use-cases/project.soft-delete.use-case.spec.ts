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
import type { Project } from '@generated/prisma-client/client';
import { ActivityLogService } from '@modules/activity-log/services/activity-log.service';
import type { IActivityLogStaged } from '@modules/activity-log/interfaces/activity-log.interface';
import { ProjectService } from '@modules/project/services/project.service';
import { ProjectNotFoundException } from '@modules/project/exceptions/project.not-found.exception';
import { WorkspaceInviteService } from '@modules/workspace/services/workspace.invite.service';
import { ProjectSoftDeleteUseCase } from '@modules/project/use-cases/project.soft-delete.use-case';

describe('ProjectSoftDeleteUseCase', () => {
    const projectService: MockProxy<ProjectService> = mock<ProjectService>();

    const activityLogService: MockProxy<ActivityLogService> =
        mock<ActivityLogService>();

    const workspaceInviteService: MockProxy<WorkspaceInviteService> =
        mock<WorkspaceInviteService>();

    const databaseService: MockProxy<DatabaseService> = mock<DatabaseService>();

    const databaseUtil: MockProxy<DatabaseUtil> = mock<DatabaseUtil>();

    const helperDateService: MockProxy<HelperDateService> =
        mock<HelperDateService>();

    const tx: IDatabaseTransactionClient = mock<IDatabaseTransactionClient>();

    const deletedAt = new Date('2026-02-01T00:00:00.000Z');

    const stagedActivityLog: IActivityLogStaged = {
        action: EnumActivityLogAction.projectCreated,
        metadata: {},
        userId: '507f1f77bcf86cd799439015',
        createdBy: '507f1f77bcf86cd799439015',
        workspaceId: '507f1f77bcf86cd799439012',
    };

    let useCase: ProjectSoftDeleteUseCase;

    const project: Project = {
        id: '507f1f77bcf86cd799439011',
        workspaceId: '507f1f77bcf86cd799439012',
        name: 'Website Revamp',
        slug: 'p-abc123',
        description: null,
        createdAt: new Date('2026-01-01T00:00:00.000Z'),
        createdBy: null,
        updatedAt: new Date('2026-01-01T00:00:00.000Z'),
        updatedBy: null,
        deletedAt: null,
        deletedBy: null,
    };

    beforeEach(async () => {
        vi.resetAllMocks();
        activityLogService.prepare.mockReturnValue(stagedActivityLog);
        helperDateService.create.mockReturnValue(deletedAt);
        databaseService.withTransaction.mockImplementation(async fn => fn(tx));

        const module: TestingModule = await Test.createTestingModule({
            providers: [
                ProjectSoftDeleteUseCase,
                { provide: ProjectService, useValue: projectService },
                {
                    provide: WorkspaceInviteService,
                    useValue: workspaceInviteService,
                },
                { provide: ActivityLogService, useValue: activityLogService },
                { provide: DatabaseService, useValue: databaseService },
                { provide: DatabaseUtil, useValue: databaseUtil },
                { provide: HelperDateService, useValue: helperDateService },
            ],
        }).compile();

        useCase = module.get(ProjectSoftDeleteUseCase);
    });

    describe('execute', () => {
        it('soft-deletes the project and clears it from the pending invites in order on one transaction', async () => {
            const callOrder: string[] = [];
            projectService.softDeleteProjectInTx.mockImplementation(
                async () => {
                    callOrder.push('project');
                }
            );
            workspaceInviteService.clearProjectInTx.mockImplementation(
                async () => {
                    callOrder.push('invites');
                }
            );

            const result = await useCase.execute(
                project,
                '507f1f77bcf86cd799439015'
            );

            expect(result).toEqual({});
            expect(databaseService.withTransaction).toHaveBeenCalledTimes(1);
            expect(projectService.softDeleteProjectInTx).toHaveBeenCalledWith(
                tx,
                project,
                deletedAt,
                '507f1f77bcf86cd799439015'
            );
            expect(
                workspaceInviteService.clearProjectInTx
            ).toHaveBeenCalledWith(tx, project.id);
            expect(callOrder).toEqual(['project', 'invites']);
        });

        it('prepares the deleted activity log before the write and stages it after', async () => {
            projectService.softDeleteProjectInTx.mockImplementation(
                async () => {
                    expect(activityLogService.prepare).toHaveBeenCalledWith({
                        action: EnumActivityLogAction.projectDeleted,
                        userId: '507f1f77bcf86cd799439015',
                        createdBy: '507f1f77bcf86cd799439015',
                        workspaceId: project.workspaceId,
                    });
                    expect(
                        activityLogService.stagePrepared
                    ).not.toHaveBeenCalled();
                }
            );

            await useCase.execute(project, '507f1f77bcf86cd799439015');

            expect(activityLogService.stagePrepared).toHaveBeenCalledWith([
                stagedActivityLog,
            ]);
        });

        it('clears no invite and stages nothing when the soft delete rejects', async () => {
            const failure = new ProjectNotFoundException();
            projectService.softDeleteProjectInTx.mockRejectedValue(failure);

            await expect(
                useCase.execute(project, '507f1f77bcf86cd799439015')
            ).rejects.toBe(failure);
            expect(
                workspaceInviteService.clearProjectInTx
            ).not.toHaveBeenCalled();
            expect(activityLogService.stagePrepared).not.toHaveBeenCalled();
        });

        it('answers ProjectNotFoundException on a write conflict', async () => {
            const conflict = new Error('conflict');
            projectService.softDeleteProjectInTx.mockRejectedValue(conflict);
            databaseUtil.toException.mockReturnValue(
                new DatabaseWriteConflictException()
            );

            await expect(
                useCase.execute(project, '507f1f77bcf86cd799439015')
            ).rejects.toBeInstanceOf(ProjectNotFoundException);
            expect(databaseUtil.toException).toHaveBeenCalledWith(conflict);
            expect(activityLogService.stagePrepared).not.toHaveBeenCalled();
        });

        it('wraps an unknown error', async () => {
            projectService.softDeleteProjectInTx.mockRejectedValue(
                new Error('boom')
            );
            databaseUtil.toException.mockReturnValue(null);

            await expect(
                useCase.execute(project, '507f1f77bcf86cd799439015')
            ).rejects.toBeInstanceOf(AppUnknownException);
            expect(activityLogService.stagePrepared).not.toHaveBeenCalled();
        });
    });
});
