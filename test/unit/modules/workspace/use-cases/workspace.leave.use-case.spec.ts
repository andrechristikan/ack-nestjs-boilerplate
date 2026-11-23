import type { IWorkspaceMemberWithRole } from '@modules/workspace/interfaces/workspace.interface';
import { buildActivityLogCreateManyEffect } from '@test/unit/helpers/test.unit.activity-log-effect.helper';
import { Test } from '@nestjs/testing';
import type { TestingModule } from '@nestjs/testing';
import { mock } from 'vitest-mock-extended';
import type { MockProxy } from 'vitest-mock-extended';
import { AppUnknownException } from '@app/exceptions/app.unknown.exception';
import { DatabaseWriteConflictException } from '@common/database/exceptions/database.write-conflict.exception';
import type { IDatabaseTransactionClient } from '@common/database/interfaces/database.client.interface';
import { DatabaseUtil } from '@common/database/utils/database.util';
import {
    EnumActivityLogAction,
    EnumRoleScope,
} from '@generated/prisma-client/client';
import { ActivityLogService } from '@modules/activity-log/services/activity-log.service';
import { OutboxService } from '@common/outbox/services/outbox.service';
import { ProjectMemberService } from '@modules/project/services/project.member.service';
import { UserService } from '@modules/user/services/user.service';
import { WorkspaceJoinRequestService } from '@modules/workspace/services/workspace.join-request.service';
import { WorkspaceLastOwnerException } from '@modules/workspace/exceptions/workspace.last-owner.exception';
import { WorkspaceMemberNotFoundException } from '@modules/workspace/exceptions/workspace.member-not-found.exception';
import { WorkspaceMemberService } from '@modules/workspace/services/workspace.member.service';
import { WorkspaceLeaveUseCase } from '@modules/workspace/use-cases/workspace.leave.use-case';
import {
    buildUser,
    buildWorkspace,
    buildRequestContext,
    buildApiKeyContext,
    buildUserContext,
    buildAuthJwtAccessContext,
    buildWorkspaceContext,
} from '@test/unit/helpers/test.unit.request.helper';

describe('WorkspaceLeaveUseCase', () => {
    const workspaceMemberService: MockProxy<WorkspaceMemberService> =
        mock<WorkspaceMemberService>();
    const activityLogService: MockProxy<ActivityLogService> =
        mock<ActivityLogService>();
    const projectMemberService: MockProxy<ProjectMemberService> =
        mock<ProjectMemberService>();
    const workspaceJoinRequestService: MockProxy<WorkspaceJoinRequestService> =
        mock<WorkspaceJoinRequestService>();
    const userService: MockProxy<UserService> = mock<UserService>();
    const outboxService: MockProxy<OutboxService> = mock<OutboxService>();
    const firstEntry = buildActivityLogCreateManyEffect('first-entry');
    const secondEntry = buildActivityLogCreateManyEffect('second-entry');
    const databaseUtil: MockProxy<DatabaseUtil> = mock<DatabaseUtil>();
    const tx: IDatabaseTransactionClient = mock<IDatabaseTransactionClient>();
    const member: IWorkspaceMemberWithRole = {
        id: 'member-1',
        createdAt: new Date('2026-01-01T00:00:00.000Z'),
        createdBy: null,
        updatedAt: new Date('2026-01-01T00:00:00.000Z'),
        updatedBy: null,
        workspaceId: 'workspace-1',
        userId: 'user-1',
        roleId: 'role-workspace-owner',
        role: {
            id: 'role-workspace-owner',
            scope: EnumRoleScope.workspace,
            key: 'owner',
            name: 'owner',
            policyRevision: 0,
        },
        joinedAt: new Date('2026-01-01T00:00:00.000Z'),
    };
    const requestContext = buildRequestContext();
    const apiKeyContext = buildApiKeyContext();
    const userContext = buildUserContext(
        buildUser('user-1', 'jane@example.com')
    );
    const authContext = buildAuthJwtAccessContext(userContext.user.id);
    const workspaceContext = buildWorkspaceContext(buildWorkspace(), member);

    let useCase: WorkspaceLeaveUseCase;

    beforeEach(async () => {
        vi.resetAllMocks();
        activityLogService.recordEffect
            .mockReturnValueOnce(firstEntry)
            .mockReturnValueOnce(secondEntry);
        outboxService.withTransaction.mockImplementation(async fn => fn(tx));

        const module: TestingModule = await Test.createTestingModule({
            providers: [
                WorkspaceLeaveUseCase,
                {
                    provide: WorkspaceMemberService,
                    useValue: workspaceMemberService,
                },
                { provide: ActivityLogService, useValue: activityLogService },
                {
                    provide: ProjectMemberService,
                    useValue: projectMemberService,
                },
                {
                    provide: WorkspaceJoinRequestService,
                    useValue: workspaceJoinRequestService,
                },
                { provide: UserService, useValue: userService },
                { provide: OutboxService, useValue: outboxService },
                { provide: DatabaseUtil, useValue: databaseUtil },
            ],
        }).compile();

        useCase = module.get(WorkspaceLeaveUseCase);
    });

    describe('execute', () => {
        it('leaves and cascades on one transaction and adds the left entry on it', async () => {
            const callOrder: string[] = [];
            workspaceMemberService.leaveWorkspaceInTx.mockImplementation(
                async () => {
                    callOrder.push('leave');
                }
            );
            projectMemberService.removeByWorkspaceAndUserInTx.mockImplementation(
                async () => {
                    callOrder.push('projectMembers');

                    return 2;
                }
            );
            workspaceJoinRequestService.cancelPendingByUserInTx.mockImplementation(
                async () => {
                    callOrder.push('joinRequests');

                    return 1;
                }
            );
            userService.clearLastWorkspaceInTx.mockImplementation(async () => {
                callOrder.push('lastWorkspace');
            });
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
            expect(outboxService.withTransaction).toHaveBeenCalledTimes(1);
            expect(
                workspaceMemberService.leaveWorkspaceInTx
            ).toHaveBeenCalledWith(tx, member);
            expect(
                projectMemberService.removeByWorkspaceAndUserInTx
            ).toHaveBeenCalledWith(tx, 'workspace-1', 'user-1');
            expect(
                workspaceJoinRequestService.cancelPendingByUserInTx
            ).toHaveBeenCalledWith(tx, 'workspace-1', 'user-1');
            expect(userService.clearLastWorkspaceInTx).toHaveBeenCalledWith(
                tx,
                'user-1',
                'workspace-1'
            );
            expect(activityLogService.recordEffect).toHaveBeenCalledWith(
                requestContext,
                apiKeyContext,
                authContext,
                workspaceContext,
                {
                    action: EnumActivityLogAction.workspaceMemberLeft,
                    userId: 'user-1',
                    createdBy: 'user-1',
                    workspaceId: 'workspace-1',
                }
            );
            expect(outboxService.addInTx).toHaveBeenCalledWith(tx, firstEntry);
            expect(callOrder).toEqual([
                'leave',
                'projectMembers',
                'joinRequests',
                'lastWorkspace',
                'addEntry',
            ]);
        });

        it('runs no cascade and adds no entry when leaving rejects', async () => {
            workspaceMemberService.leaveWorkspaceInTx.mockRejectedValue(
                new WorkspaceLastOwnerException()
            );

            await expect(
                useCase.execute(
                    requestContext,
                    apiKeyContext,
                    authContext,
                    workspaceContext
                )
            ).rejects.toBeInstanceOf(WorkspaceLastOwnerException);
            expect(
                projectMemberService.removeByWorkspaceAndUserInTx
            ).not.toHaveBeenCalled();
            expect(
                workspaceJoinRequestService.cancelPendingByUserInTx
            ).not.toHaveBeenCalled();
            expect(userService.clearLastWorkspaceInTx).not.toHaveBeenCalled();
            expect(outboxService.addInTx).not.toHaveBeenCalled();
        });

        it('maps a write conflict to WorkspaceMemberNotFoundException', async () => {
            const conflict = new Error('conflict');
            workspaceMemberService.leaveWorkspaceInTx.mockRejectedValue(
                conflict
            );
            databaseUtil.toException.mockReturnValue(
                new DatabaseWriteConflictException()
            );

            await expect(
                useCase.execute(
                    requestContext,
                    apiKeyContext,
                    authContext,
                    workspaceContext
                )
            ).rejects.toBeInstanceOf(WorkspaceMemberNotFoundException);
            expect(databaseUtil.toException).toHaveBeenCalledWith(conflict);
            expect(outboxService.addInTx).not.toHaveBeenCalled();
        });

        it('wraps any other transaction error in AppUnknownException', async () => {
            workspaceMemberService.leaveWorkspaceInTx.mockRejectedValue(
                new Error('boom')
            );
            databaseUtil.toException.mockReturnValue(null);

            await expect(
                useCase.execute(
                    requestContext,
                    apiKeyContext,
                    authContext,
                    workspaceContext
                )
            ).rejects.toBeInstanceOf(AppUnknownException);
        });
    });
});
