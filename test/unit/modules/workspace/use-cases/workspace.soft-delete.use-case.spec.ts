import { EnumPolicyAction } from '@generated/prisma-client/client';
import { PolicyForbiddenException } from '@modules/policy/exceptions/policy.forbidden.exception';
import { PolicyAbilityService } from '@modules/policy/services/policy.ability.service';
import {
    buildPolicyAbility,
    buildPolicyContext,
} from '@test/unit/helpers/test.unit.policy.helper';
import { buildActivityLogCreateManyEffect } from '@test/unit/helpers/test.unit.activity-log-effect.helper';
import { ConfigService } from '@nestjs/config';
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

import { ActivityLogService } from '@modules/activity-log/services/activity-log.service';
import { OutboxService } from '@common/outbox/services/outbox.service';
import { ProjectService } from '@modules/project/services/project.service';
import { WorkspaceNotFoundException } from '@modules/workspace/exceptions/workspace.not-found.exception';
import { WorkspaceService } from '@modules/workspace/services/workspace.service';
import { WorkspaceInviteService } from '@modules/workspace/services/workspace.invite.service';
import { WorkspaceJoinRequestService } from '@modules/workspace/services/workspace.join-request.service';
import { buildConfigService } from '@test/unit/helpers/test.unit.config.helper';
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
    const policyAbilityService: MockProxy<PolicyAbilityService> =
        mock<PolicyAbilityService>();
    const policyContext = buildPolicyContext(buildPolicyAbility([]));
    const workspaceService: MockProxy<WorkspaceService> =
        mock<WorkspaceService>();
    const workspaceInviteService: MockProxy<WorkspaceInviteService> =
        mock<WorkspaceInviteService>();
    const workspaceJoinRequestService: MockProxy<WorkspaceJoinRequestService> =
        mock<WorkspaceJoinRequestService>();
    const projectService: MockProxy<ProjectService> = mock<ProjectService>();
    const activityLogService: MockProxy<ActivityLogService> =
        mock<ActivityLogService>();
    const outboxService: MockProxy<OutboxService> = mock<OutboxService>();
    const firstEntry = buildActivityLogCreateManyEffect('first-entry');
    const secondEntry = buildActivityLogCreateManyEffect('second-entry');
    const databaseUtil: MockProxy<DatabaseUtil> = mock<DatabaseUtil>();
    const helperDateService: MockProxy<HelperDateService> =
        mock<HelperDateService>();
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

    beforeEach(async () => {
        vi.resetAllMocks();
        activityLogService.recordEffect
            .mockReturnValueOnce(firstEntry)
            .mockReturnValueOnce(secondEntry);
        helperDateService.create.mockReturnValue(deletedAt);
        outboxService.withTransaction.mockImplementation(async fn => fn(tx));

        const module: TestingModule = await Test.createTestingModule({
            providers: [
                WorkspaceSoftDeleteUseCase,
                {
                    provide: PolicyAbilityService,
                    useValue: policyAbilityService,
                },
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
                { provide: OutboxService, useValue: outboxService },
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
        it('authorizes the delete on the context workspace before any write', async () => {
            await useCase.execute(
                requestContext,
                apiKeyContext,
                authContext,
                workspaceContext,
                policyContext
            );

            expect(policyAbilityService.authorize).toHaveBeenCalledWith(
                policyContext,
                EnumPolicyAction.delete,
                expect.objectContaining({
                    __caslSubjectType__: 'Workspace',
                    id: workspaceContext.workspace.id,
                })
            );
            expect(policyAbilityService.authorize).toHaveBeenCalledBefore(
                outboxService.withTransaction
            );
        });

        it('rejects with the forbidden error and writes nothing when the ability denies the delete', async () => {
            policyAbilityService.authorize.mockImplementation(() => {
                throw new PolicyForbiddenException();
            });

            await expect(
                useCase.execute(
                    requestContext,
                    apiKeyContext,
                    authContext,
                    workspaceContext,
                    policyContext
                )
            ).rejects.toThrow(PolicyForbiddenException);
            expect(workspaceService.softDeleteInTx).not.toHaveBeenCalled();
        });

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
                workspaceContext,
                policyContext
            );

            expect(result).toEqual({});
            expect(outboxService.withTransaction).toHaveBeenCalledTimes(1);
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
            expect(activityLogService.recordEffect).toHaveBeenCalledWith(
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
                    workspaceContext,
                    policyContext
                )
            ).rejects.toBeInstanceOf(WorkspaceNotFoundException);
            expect(outboxService.withTransaction).toHaveBeenCalledTimes(1);
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
                workspaceContext,
                policyContext
            );

            expect(outboxService.withTransaction).toHaveBeenCalledWith(
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
                useCase.execute(
                    requestContext,
                    apiKeyContext,
                    authContext,
                    workspaceContext,
                    policyContext
                )
            ).rejects.toBeInstanceOf(WorkspaceNotFoundException);
            expect(databaseUtil.toException).toHaveBeenCalledWith(conflict);
            expect(outboxService.addInTx).not.toHaveBeenCalled();
        });

        it('wraps an unknown error', async () => {
            workspaceService.softDeleteInTx.mockRejectedValue(
                new Error('boom')
            );
            databaseUtil.toException.mockReturnValue(null);

            await expect(
                useCase.execute(
                    requestContext,
                    apiKeyContext,
                    authContext,
                    workspaceContext,
                    policyContext
                )
            ).rejects.toBeInstanceOf(AppUnknownException);
            expect(outboxService.addInTx).not.toHaveBeenCalled();
        });
    });
});
