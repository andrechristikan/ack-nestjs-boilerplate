import { EnumPolicyAction } from '@generated/prisma-client/client';
import { PolicyForbiddenException } from '@modules/policy/exceptions/policy.forbidden.exception';
import { PolicyAbilityService } from '@modules/policy/services/policy.ability.service';
import {
    buildPolicyAbility,
    buildPolicyContext,
} from '@test/unit/helpers/test.unit.policy.helper';
import { buildActivityLogCreateManyEffect } from '@test/unit/helpers/test.unit.activity-log-effect.helper';
import { Test } from '@nestjs/testing';
import type { TestingModule } from '@nestjs/testing';
import { mock } from 'vitest-mock-extended';
import type { MockProxy } from 'vitest-mock-extended';
import { AppUnknownException } from '@app/exceptions/app.unknown.exception';
import { DatabaseWriteConflictException } from '@common/database/exceptions/database.write-conflict.exception';
import type { IDatabaseTransactionClient } from '@common/database/interfaces/database.client.interface';
import { DatabaseUtil } from '@common/database/utils/database.util';
import { HelperDateService } from '@common/helper/services/helper.date.service';
import { EnumActivityLogAction } from '@generated/prisma-client/client';
import type { Project } from '@generated/prisma-client/client';
import { ActivityLogService } from '@modules/activity-log/services/activity-log.service';
import { OutboxService } from '@common/outbox/services/outbox.service';
import { ProjectService } from '@modules/project/services/project.service';
import { ProjectNotFoundException } from '@modules/project/exceptions/project.not-found.exception';
import { WorkspaceInviteService } from '@modules/workspace/services/workspace.invite.service';
import { ProjectSoftDeleteUseCase } from '@modules/project/use-cases/project.soft-delete.use-case';
import {
    buildUser,
    buildWorkspace,
    buildWorkspaceMember,
    buildRequestContext,
    buildApiKeyContext,
    buildUserContext,
    buildAuthJwtAccessContext,
    buildWorkspaceContext,
    buildProjectContext,
} from '@test/unit/helpers/test.unit.request.helper';

describe('ProjectSoftDeleteUseCase', () => {
    const projectService: MockProxy<ProjectService> = mock<ProjectService>();

    const policyAbilityService: MockProxy<PolicyAbilityService> =
        mock<PolicyAbilityService>();
    const policyContext = buildPolicyContext(buildPolicyAbility([]));

    const activityLogService: MockProxy<ActivityLogService> =
        mock<ActivityLogService>();

    const workspaceInviteService: MockProxy<WorkspaceInviteService> =
        mock<WorkspaceInviteService>();

    const outboxService: MockProxy<OutboxService> = mock<OutboxService>();
    const firstEntry = buildActivityLogCreateManyEffect('first-entry');
    const secondEntry = buildActivityLogCreateManyEffect('second-entry');

    const databaseUtil: MockProxy<DatabaseUtil> = mock<DatabaseUtil>();

    const helperDateService: MockProxy<HelperDateService> =
        mock<HelperDateService>();

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

    const requestContext = buildRequestContext();
    const apiKeyContext = buildApiKeyContext();
    const userContext = buildUserContext(
        buildUser('507f1f77bcf86cd799439015', 'jane@example.com')
    );
    const authContext = buildAuthJwtAccessContext(userContext.user.id);
    const workspaceContext = buildWorkspaceContext(
        { ...buildWorkspace(), id: project.workspaceId },
        buildWorkspaceMember('507f1f77bcf86cd799439015')
    );
    const projectContext = buildProjectContext(project, null);

    beforeEach(async () => {
        vi.resetAllMocks();
        activityLogService.recordEffect
            .mockReturnValueOnce(firstEntry)
            .mockReturnValueOnce(secondEntry);
        helperDateService.create.mockReturnValue(deletedAt);
        outboxService.withTransaction.mockImplementation(async fn => fn(tx));

        const module: TestingModule = await Test.createTestingModule({
            providers: [
                ProjectSoftDeleteUseCase,
                { provide: ProjectService, useValue: projectService },
                {
                    provide: PolicyAbilityService,
                    useValue: policyAbilityService,
                },
                {
                    provide: WorkspaceInviteService,
                    useValue: workspaceInviteService,
                },
                { provide: ActivityLogService, useValue: activityLogService },
                { provide: OutboxService, useValue: outboxService },
                { provide: DatabaseUtil, useValue: databaseUtil },
                { provide: HelperDateService, useValue: helperDateService },
            ],
        }).compile();

        useCase = module.get(ProjectSoftDeleteUseCase);
    });

    describe('execute', () => {
        it('authorizes the delete on the context project before the transaction opens', async () => {
            await useCase.execute(
                requestContext,
                apiKeyContext,
                authContext,
                workspaceContext,
                projectContext,
                policyContext
            );

            expect(policyAbilityService.authorize).toHaveBeenCalledWith(
                policyContext,
                EnumPolicyAction.delete,
                expect.objectContaining({
                    __caslSubjectType__: 'Project',
                    id: project.id,
                })
            );
            expect(policyAbilityService.authorize).toHaveBeenCalledBefore(
                outboxService.withTransaction
            );
        });

        it('rejects with the forbidden error and deletes nothing when the ability denies the delete', async () => {
            policyAbilityService.authorize.mockImplementation(() => {
                throw new PolicyForbiddenException();
            });

            await expect(
                useCase.execute(
                    requestContext,
                    apiKeyContext,
                    authContext,
                    workspaceContext,
                    projectContext,
                    policyContext
                )
            ).rejects.toThrow(PolicyForbiddenException);
            expect(outboxService.withTransaction).not.toHaveBeenCalled();
            expect(projectService.softDeleteProjectInTx).not.toHaveBeenCalled();
        });

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
                requestContext,
                apiKeyContext,
                authContext,
                workspaceContext,
                projectContext,
                policyContext
            );

            expect(result).toEqual({});
            expect(outboxService.withTransaction).toHaveBeenCalledTimes(1);
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

        it('adds the deleted entry on the same tx after the cascade', async () => {
            await useCase.execute(
                requestContext,
                apiKeyContext,
                authContext,
                workspaceContext,
                projectContext,
                policyContext
            );

            expect(activityLogService.recordEffect).toHaveBeenCalledWith(
                requestContext,
                apiKeyContext,
                authContext,
                workspaceContext,
                {
                    action: EnumActivityLogAction.projectDeleted,
                    userId: '507f1f77bcf86cd799439015',
                    createdBy: '507f1f77bcf86cd799439015',
                    workspaceId: project.workspaceId,
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
                    workspaceContext,
                    projectContext,
                    policyContext
                )
            ).rejects.toBe(failure);
            expect(
                workspaceInviteService.clearProjectInTx
            ).not.toHaveBeenCalled();
            expect(outboxService.addInTx).not.toHaveBeenCalled();
        });

        it('answers ProjectNotFoundException on a write conflict', async () => {
            const conflict = new Error('conflict');
            projectService.softDeleteProjectInTx.mockRejectedValue(conflict);
            databaseUtil.toException.mockReturnValue(
                new DatabaseWriteConflictException()
            );

            await expect(
                useCase.execute(
                    requestContext,
                    apiKeyContext,
                    authContext,
                    workspaceContext,
                    projectContext,
                    policyContext
                )
            ).rejects.toBeInstanceOf(ProjectNotFoundException);
            expect(databaseUtil.toException).toHaveBeenCalledWith(conflict);
            expect(outboxService.addInTx).not.toHaveBeenCalled();
        });

        it('wraps an unknown error', async () => {
            projectService.softDeleteProjectInTx.mockRejectedValue(
                new Error('boom')
            );
            databaseUtil.toException.mockReturnValue(null);

            await expect(
                useCase.execute(
                    requestContext,
                    apiKeyContext,
                    authContext,
                    workspaceContext,
                    projectContext,
                    policyContext
                )
            ).rejects.toBeInstanceOf(AppUnknownException);
            expect(outboxService.addInTx).not.toHaveBeenCalled();
        });
    });
});
