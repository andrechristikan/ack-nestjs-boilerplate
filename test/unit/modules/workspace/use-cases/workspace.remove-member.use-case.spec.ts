import {
    buildPolicyAbility,
    buildPolicyContext,
} from '@test/unit/helpers/test.unit.policy.helper';
import { PolicyAbilityService } from '@modules/policy/services/policy.ability.service';
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
import { WorkspaceInviteService } from '@modules/workspace/services/workspace.invite.service';
import { WorkspaceJoinRequestService } from '@modules/workspace/services/workspace.join-request.service';
import { WorkspaceMemberNotFoundException } from '@modules/workspace/exceptions/workspace.member-not-found.exception';
import { WorkspaceMemberPeerForbiddenException } from '@modules/workspace/exceptions/workspace.member-peer-forbidden.exception';
import { WorkspaceMemberService } from '@modules/workspace/services/workspace.member.service';
import { WorkspaceRemoveMemberUseCase } from '@modules/workspace/use-cases/workspace.remove-member.use-case';
import {
    buildUser,
    buildWorkspace,
    buildRequestContext,
    buildApiKeyContext,
    buildUserContext,
    buildAuthJwtAccessContext,
    buildWorkspaceContext,
} from '@test/unit/helpers/test.unit.request.helper';
import type { IPolicyWhereInput } from '@modules/policy/interfaces/policy.interface';

describe('WorkspaceRemoveMemberUseCase', () => {
    const policyContext = buildPolicyContext(buildPolicyAbility([]));
    const policyAbilityService: MockProxy<PolicyAbilityService> =
        mock<PolicyAbilityService>();
    const scoped: IPolicyWhereInput<'WorkspaceMember'> = { id: 'scoped-1' };
    const workspaceMemberService: MockProxy<WorkspaceMemberService> =
        mock<WorkspaceMemberService>();
    const activityLogService: MockProxy<ActivityLogService> =
        mock<ActivityLogService>();
    const projectMemberService: MockProxy<ProjectMemberService> =
        mock<ProjectMemberService>();
    const workspaceJoinRequestService: MockProxy<WorkspaceJoinRequestService> =
        mock<WorkspaceJoinRequestService>();
    const workspaceInviteService: MockProxy<WorkspaceInviteService> =
        mock<WorkspaceInviteService>();
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

    let useCase: WorkspaceRemoveMemberUseCase;

    beforeEach(async () => {
        vi.resetAllMocks();
        policyAbilityService.scope.mockReturnValue(scoped);
        activityLogService.recordEffect
            .mockReturnValueOnce(firstEntry)
            .mockReturnValueOnce(secondEntry);
        outboxService.withTransaction.mockImplementation(async fn => fn(tx));

        const module: TestingModule = await Test.createTestingModule({
            providers: [
                {
                    provide: PolicyAbilityService,
                    useValue: policyAbilityService,
                },
                WorkspaceRemoveMemberUseCase,
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
                {
                    provide: WorkspaceInviteService,
                    useValue: workspaceInviteService,
                },
                { provide: UserService, useValue: userService },
                { provide: OutboxService, useValue: outboxService },
                { provide: DatabaseUtil, useValue: databaseUtil },
            ],
        }).compile();

        useCase = module.get(WorkspaceRemoveMemberUseCase);
    });

    describe('execute', () => {
        const target: IWorkspaceMemberWithRole = {
            ...member,
            id: 'member-2',
            userId: 'user-2',
            roleId: 'role-workspace-member',
            role: {
                id: 'role-workspace-member',
                scope: EnumRoleScope.workspace,
                key: 'member',
                name: 'member',
                policyRevision: 0,
            },
        };

        it('removes the member and cascades on one transaction for the returned target, then adds the actor entry and the target entry on the same tx', async () => {
            const callOrder: string[] = [];
            workspaceMemberService.removeMemberInTx.mockImplementation(
                async () => {
                    callOrder.push('remove');

                    return target;
                }
            );
            projectMemberService.removeByWorkspaceAndUserInTx.mockImplementation(
                async () => {
                    callOrder.push('projectMembers');

                    return 1;
                }
            );
            userService.getEmailByIdInTx.mockImplementation(async () => {
                callOrder.push('email');

                return 'user-2@example.com';
            });
            workspaceInviteService.revokePendingByEmailInTx.mockImplementation(
                async () => {
                    callOrder.push('invite');
                }
            );
            workspaceJoinRequestService.cancelPendingByUserInTx.mockImplementation(
                async () => {
                    callOrder.push('joinRequests');

                    return 0;
                }
            );
            userService.clearLastWorkspaceInTx.mockImplementation(async () => {
                callOrder.push('lastWorkspace');
            });

            const result = await useCase.execute(
                requestContext,
                apiKeyContext,
                authContext,
                workspaceContext,
                policyContext,
                'member-2'
            );

            expect(result).toEqual({});
            expect(outboxService.withTransaction).toHaveBeenCalledTimes(1);
            expect(
                workspaceMemberService.removeMemberInTx
            ).toHaveBeenCalledWith(
                tx,
                'workspace-1',
                member,
                'member-2',
                scoped
            );
            expect(
                projectMemberService.removeByWorkspaceAndUserInTx
            ).toHaveBeenCalledWith(tx, 'workspace-1', 'user-2');
            expect(
                workspaceJoinRequestService.cancelPendingByUserInTx
            ).toHaveBeenCalledWith(tx, 'workspace-1', 'user-2');
            expect(userService.clearLastWorkspaceInTx).toHaveBeenCalledWith(
                tx,
                'user-2',
                'workspace-1'
            );
            expect(callOrder).toEqual([
                'remove',
                'projectMembers',
                'email',
                'invite',
                'joinRequests',
                'lastWorkspace',
            ]);
            expect(activityLogService.recordEffect).toHaveBeenNthCalledWith(
                1,
                requestContext,
                apiKeyContext,
                authContext,
                workspaceContext,
                {
                    action: EnumActivityLogAction.workspaceMemberRemoved,
                    userId: 'user-1',
                    createdBy: 'user-1',
                    workspaceId: 'workspace-1',
                    metadata: { targetUserId: 'user-2' },
                }
            );
            expect(activityLogService.recordEffect).toHaveBeenNthCalledWith(
                2,
                requestContext,
                apiKeyContext,
                authContext,
                workspaceContext,
                {
                    action: EnumActivityLogAction.workspaceMemberRemovedByAdmin,
                    userId: 'user-2',
                    createdBy: 'user-1',
                    workspaceId: 'workspace-1',
                    metadata: { actorUserId: 'user-1' },
                }
            );
            expect(outboxService.addManyInTx).toHaveBeenCalledWith(tx, [
                firstEntry,
                secondEntry,
            ]);
        });

        it("revokes the pending invite to the removed member's email on the same tx", async () => {
            workspaceMemberService.removeMemberInTx.mockResolvedValue(target);
            userService.getEmailByIdInTx.mockResolvedValue(
                'user-2@example.com'
            );

            await useCase.execute(
                requestContext,
                apiKeyContext,
                authContext,
                workspaceContext,
                policyContext,
                'member-2'
            );

            expect(userService.getEmailByIdInTx).toHaveBeenCalledWith(
                tx,
                'user-2'
            );
            expect(
                workspaceInviteService.revokePendingByEmailInTx
            ).toHaveBeenCalledWith(tx, 'workspace-1', 'user-2@example.com');
        });

        it('skips the revoke when the user has no row', async () => {
            workspaceMemberService.removeMemberInTx.mockResolvedValue(target);
            userService.getEmailByIdInTx.mockResolvedValue(null);

            const result = await useCase.execute(
                requestContext,
                apiKeyContext,
                authContext,
                workspaceContext,
                policyContext,
                'member-2'
            );

            expect(result).toEqual({});
            expect(userService.getEmailByIdInTx).toHaveBeenCalledWith(
                tx,
                'user-2'
            );
            expect(
                workspaceInviteService.revokePendingByEmailInTx
            ).not.toHaveBeenCalled();
        });

        it('runs no cascade and adds no entry when the removal rejects', async () => {
            workspaceMemberService.removeMemberInTx.mockRejectedValue(
                new WorkspaceMemberNotFoundException()
            );

            await expect(
                useCase.execute(
                    requestContext,
                    apiKeyContext,
                    authContext,
                    workspaceContext,
                    policyContext,
                    'member-2'
                )
            ).rejects.toBeInstanceOf(WorkspaceMemberNotFoundException);
            expect(
                projectMemberService.removeByWorkspaceAndUserInTx
            ).not.toHaveBeenCalled();
            expect(userService.getEmailByIdInTx).not.toHaveBeenCalled();
            expect(
                workspaceInviteService.revokePendingByEmailInTx
            ).not.toHaveBeenCalled();
            expect(
                workspaceJoinRequestService.cancelPendingByUserInTx
            ).not.toHaveBeenCalled();
            expect(userService.clearLastWorkspaceInTx).not.toHaveBeenCalled();
            expect(outboxService.addManyInTx).not.toHaveBeenCalled();
        });

        it('maps a write conflict to WorkspaceMemberPeerForbiddenException', async () => {
            const conflict = new Error('conflict');
            workspaceMemberService.removeMemberInTx.mockRejectedValue(conflict);
            databaseUtil.toException.mockReturnValue(
                new DatabaseWriteConflictException()
            );

            await expect(
                useCase.execute(
                    requestContext,
                    apiKeyContext,
                    authContext,
                    workspaceContext,
                    policyContext,
                    'member-2'
                )
            ).rejects.toBeInstanceOf(WorkspaceMemberPeerForbiddenException);
            expect(databaseUtil.toException).toHaveBeenCalledWith(conflict);
            expect(outboxService.addManyInTx).not.toHaveBeenCalled();
        });

        it('wraps any other transaction error in AppUnknownException', async () => {
            workspaceMemberService.removeMemberInTx.mockRejectedValue(
                new Error('boom')
            );
            databaseUtil.toException.mockReturnValue(null);

            await expect(
                useCase.execute(
                    requestContext,
                    apiKeyContext,
                    authContext,
                    workspaceContext,
                    policyContext,
                    'member-2'
                )
            ).rejects.toBeInstanceOf(AppUnknownException);
        });
    });
});
