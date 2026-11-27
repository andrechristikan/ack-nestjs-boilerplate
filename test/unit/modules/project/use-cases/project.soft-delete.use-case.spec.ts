import { buildActivityLogCreateManyEffect } from '@test/unit/helpers/test.unit.activity-log-effect.helper';
import { ConfigService } from '@nestjs/config';
import { Test } from '@nestjs/testing';
import type { TestingModule } from '@nestjs/testing';
import { mock } from 'vitest-mock-extended';
import type { MockProxy } from 'vitest-mock-extended';
import type { IDatabaseTransactionClient } from '@common/database/interfaces/database.client.interface';
import { EnumActivityLogAction } from '@generated/prisma-client/client';
import type { Project } from '@generated/prisma-client/client';
import type { IProjectRef } from '@modules/project/interfaces/project.interface';
import { ActivityLogQueue } from '@modules/activity-log/queues/activity-log.queue';
import { DatabaseService } from '@common/database/services/database.service';
import { OutboxService } from '@common/outbox/services/outbox.service';
import { ProjectService } from '@modules/project/services/project.service';
import { ProjectNotFoundException } from '@modules/project/exceptions/project.not-found.exception';
import { WorkspaceInviteService } from '@modules/workspace/services/workspace.invite.service';
import { ProjectSoftDeleteUseCase } from '@modules/project/use-cases/project.soft-delete.use-case';
import {
    buildUser,
    buildRequestContext,
    buildApiKeyContext,
    buildUserContext,
    buildAuthJwtAccessContext,
    buildProjectContext,
} from '@test/unit/helpers/test.unit.request.helper';
import { buildConfigService } from '@test/unit/helpers/test.unit.config.helper';
import {
    TestUnitKitConfigValues,
    TestUnitKitProviders,
} from '@test/unit/helpers/test.unit.kit.helper';

describe('ProjectSoftDeleteUseCase', () => {
    const projectService: MockProxy<ProjectService> = mock<ProjectService>();

    const activityLogQueue: MockProxy<ActivityLogQueue> =
        mock<ActivityLogQueue>();

    const workspaceInviteService: MockProxy<WorkspaceInviteService> =
        mock<WorkspaceInviteService>();

    const databaseService: MockProxy<DatabaseService> = mock<DatabaseService>();
    const outboxService: MockProxy<OutboxService> = mock<OutboxService>();
    const firstEntry = buildActivityLogCreateManyEffect('first-entry');
    const secondEntry = buildActivityLogCreateManyEffect('second-entry');

    const tx: IDatabaseTransactionClient = mock<IDatabaseTransactionClient>();

    const deletedAt = new Date('2026-02-01T00:00:00.000Z');

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

    const softDeleted: IProjectRef = {
        id: project.id,
        workspaceId: '507f1f77bcf86cd799439099',
    };

    const requestContext = buildRequestContext();
    const apiKeyContext = buildApiKeyContext();
    const userContext = buildUserContext(
        buildUser('507f1f77bcf86cd799439015', 'jane@example.com')
    );
    const authContext = buildAuthJwtAccessContext(userContext.user.id);
    const projectContext = buildProjectContext(project, null);

    beforeAll(() => {
        vi.useFakeTimers();
    });

    beforeEach(async () => {
        activityLogQueue.recordEffect
            .mockReturnValueOnce(firstEntry)
            .mockReturnValueOnce(secondEntry);
        vi.setSystemTime(deletedAt);
        databaseService.withTransaction.mockImplementation(async fn => fn(tx));
        projectService.softDeleteProjectInTx.mockResolvedValue(softDeleted);

        const module: TestingModule = await Test.createTestingModule({
            providers: [
                ProjectSoftDeleteUseCase,
                { provide: ProjectService, useValue: projectService },
                {
                    provide: WorkspaceInviteService,
                    useValue: workspaceInviteService,
                },
                { provide: ActivityLogQueue, useValue: activityLogQueue },
                { provide: DatabaseService, useValue: databaseService },
                { provide: OutboxService, useValue: outboxService },
                ...TestUnitKitProviders,
                {
                    provide: ConfigService,
                    useValue: buildConfigService(TestUnitKitConfigValues),
                },
            ],
        }).compile();

        useCase = module.get(ProjectSoftDeleteUseCase);
    });

    afterAll(() => {
        vi.useRealTimers();
    });

    describe('execute', () => {
        it('soft-deletes the project and clears it from the pending invites in order on one transaction', async () => {
            const callOrder: string[] = [];
            projectService.softDeleteProjectInTx.mockImplementation(
                async () => {
                    callOrder.push('project');

                    return softDeleted;
                }
            );
            workspaceInviteService.clearProjectInTx.mockImplementation(
                async () => {
                    callOrder.push('invites');
                }
            );

            const result = await useCase.execute(
                requestContext,
                apiKeyContext,
                authContext,
                projectContext
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

        it('adds the deleted entry on the same tx after the cascade, with the workspace id the soft delete returned', async () => {
            await useCase.execute(
                requestContext,
                apiKeyContext,
                authContext,
                projectContext
            );

            expect(activityLogQueue.recordEffect).toHaveBeenCalledWith(
                requestContext,
                apiKeyContext,
                authContext,
                {
                    action: EnumActivityLogAction.projectDeleted,
                    userId: '507f1f77bcf86cd799439015',
                    createdBy: '507f1f77bcf86cd799439015',
                    workspaceId: softDeleted.workspaceId,
                }
            );
            expect(outboxService.addInTx).toHaveBeenCalledWith(tx, firstEntry);
            expect(
                workspaceInviteService.clearProjectInTx
            ).toHaveBeenCalledBefore(outboxService.addInTx);
        });

        it('clears no invite and adds no entry when the soft delete rejects', async () => {
            const failure = new ProjectNotFoundException();
            projectService.softDeleteProjectInTx.mockRejectedValue(failure);

            await expect(
                useCase.execute(
                    requestContext,
                    apiKeyContext,
                    authContext,
                    projectContext
                )
            ).rejects.toBe(failure);
            expect(
                workspaceInviteService.clearProjectInTx
            ).not.toHaveBeenCalled();
            expect(outboxService.addInTx).not.toHaveBeenCalled();
        });
    });
});
