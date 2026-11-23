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
import { HelperDateService } from '@common/helper/services/helper.date.service';
import {
    EnumActivityLogAction,
    EnumWorkspaceInviteStatus,
    EnumRoleScope,
} from '@generated/prisma-client/client';
import type { WorkspaceInvite } from '@generated/prisma-client/client';
import { ActivityLogService } from '@modules/activity-log/services/activity-log.service';
import { OutboxService } from '@common/outbox/services/outbox.service';
import { FeatureFlagDisabledException } from '@modules/feature-flag/exceptions/feature-flag.disabled.exception';
import { ProjectMemberService } from '@modules/project/services/project.member.service';
import { UserService } from '@modules/user/services/user.service';
import type { WorkspaceInviteClaimRequestDto } from '@modules/workspace/dtos/request/workspace.invite-claim.request.dto';
import { WorkspaceInviteService } from '@modules/workspace/services/workspace.invite.service';
import { WorkspaceJoinRequestService } from '@modules/workspace/services/workspace.join-request.service';
import { WorkspaceMemberService } from '@modules/workspace/services/workspace.member.service';
import { EnumWorkspaceStatusCodeError } from '@modules/workspace/enums/workspace.status-code.enum';
import { WorkspaceInviteAlreadyProcessedException } from '@modules/workspace/exceptions/workspace.invite-already-processed.exception';
import { WorkspaceInviteInvalidException } from '@modules/workspace/exceptions/workspace.invite-invalid.exception';
import { WorkspaceMemberAlreadyExistsException } from '@modules/workspace/exceptions/workspace.member-already-exists.exception';
import { WorkspaceClaimInviteUseCase } from '@modules/workspace/use-cases/workspace.claim-invite.use-case';
import {
    buildUser,
    buildRequestContext,
    buildApiKeyContext,
    buildUserContext,
    buildAuthJwtAccessContext,
} from '@test/unit/helpers/test.unit.request.helper';

describe('WorkspaceClaimInviteUseCase', () => {
    const workspaceInviteService: MockProxy<WorkspaceInviteService> =
        mock<WorkspaceInviteService>();
    const workspaceMemberService: MockProxy<WorkspaceMemberService> =
        mock<WorkspaceMemberService>();
    const workspaceJoinRequestService: MockProxy<WorkspaceJoinRequestService> =
        mock<WorkspaceJoinRequestService>();
    const projectMemberService: MockProxy<ProjectMemberService> =
        mock<ProjectMemberService>();
    const userService: MockProxy<UserService> = mock<UserService>();
    const outboxService: MockProxy<OutboxService> = mock<OutboxService>();
    const firstEntry = buildActivityLogCreateManyEffect('first-entry');
    const secondEntry = buildActivityLogCreateManyEffect('second-entry');
    const databaseUtil: MockProxy<DatabaseUtil> = mock<DatabaseUtil>();
    const helperDateService: MockProxy<HelperDateService> =
        mock<HelperDateService>();
    const activityLogService: MockProxy<ActivityLogService> =
        mock<ActivityLogService>();
    const invite: WorkspaceInvite = {
        id: 'invite-1',
        createdAt: new Date('2026-01-01T00:00:00.000Z'),
        createdBy: 'user-1',
        updatedAt: new Date('2026-01-01T00:00:00.000Z'),
        updatedBy: 'user-1',
        workspaceId: 'workspace-1',
        email: 'invitee@example.com',
        token: 'hashed-token',
        workspaceRoleId: 'role-workspace-member',
        projectId: null,
        projectRoleId: null,
        reference: 'WIN-abc123',
        expiredAt: new Date('2026-02-01T00:00:00.000Z'),
        status: EnumWorkspaceInviteStatus.pending,
        invitedByUserId: 'user-1',
        acceptedAt: null,
        acceptedByUserId: null,
        nonce: 'aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa',
    };
    const existingMember: IWorkspaceMemberWithRole = {
        id: 'member-1',
        createdAt: new Date('2026-01-01T00:00:00.000Z'),
        createdBy: null,
        updatedAt: new Date('2026-01-01T00:00:00.000Z'),
        updatedBy: null,
        workspaceId: 'workspace-1',
        userId: 'user-2',
        roleId: 'role-workspace-member',
        role: {
            id: 'role-workspace-member',
            scope: EnumRoleScope.workspace,
            key: 'member',
            name: 'member',
            policyRevision: 0,
        },
        joinedAt: new Date('2026-01-01T00:00:00.000Z'),
    };
    const tx: IDatabaseTransactionClient = mock<IDatabaseTransactionClient>();
    const now = new Date('2026-01-01T00:00:00.000Z');
    const requestContext = buildRequestContext();
    const apiKeyContext = buildApiKeyContext();
    const userContext = buildUserContext(
        buildUser('user-2', 'account@example.com')
    );
    const authContext = buildAuthJwtAccessContext(userContext.user.id);

    let useCase: WorkspaceClaimInviteUseCase;

    beforeEach(async () => {
        vi.resetAllMocks();
        activityLogService.recordEffect
            .mockReturnValueOnce(firstEntry)
            .mockReturnValueOnce(secondEntry);
        helperDateService.create.mockReturnValue(now);
        outboxService.withTransaction.mockImplementation(async fn => fn(tx));

        const module: TestingModule = await Test.createTestingModule({
            providers: [
                WorkspaceClaimInviteUseCase,
                {
                    provide: WorkspaceInviteService,
                    useValue: workspaceInviteService,
                },
                {
                    provide: WorkspaceMemberService,
                    useValue: workspaceMemberService,
                },
                {
                    provide: WorkspaceJoinRequestService,
                    useValue: workspaceJoinRequestService,
                },
                {
                    provide: ProjectMemberService,
                    useValue: projectMemberService,
                },
                { provide: UserService, useValue: userService },
                { provide: OutboxService, useValue: outboxService },
                { provide: DatabaseUtil, useValue: databaseUtil },
                { provide: HelperDateService, useValue: helperDateService },
                { provide: ActivityLogService, useValue: activityLogService },
            ],
        }).compile();

        useCase = module.get(WorkspaceClaimInviteUseCase);
    });

    describe('execute', () => {
        const body: WorkspaceInviteClaimRequestDto = {
            inviteToken: 'raw-token',
        };

        beforeEach(() => {
            workspaceInviteService.validateInviteForEmail.mockResolvedValue(
                invite
            );
        });

        it('validates, accepts the invite before the member insert on one transaction, then adds the accepted entries on the same tx', async () => {
            const callOrder: string[] = [];
            workspaceInviteService.validateInviteForEmail.mockImplementation(
                async () => {
                    callOrder.push('validate');

                    return invite;
                }
            );
            workspaceInviteService.acceptPendingInTx.mockImplementation(
                async () => {
                    callOrder.push('acceptInvite');
                }
            );
            workspaceMemberService.createInTx.mockImplementation(async () => {
                callOrder.push('createMember');

                return existingMember;
            });
            workspaceJoinRequestService.cancelPendingByUserInTx.mockImplementation(
                async () => {
                    callOrder.push('cancelJoinRequest');

                    return 1;
                }
            );
            userService.setLastWorkspaceInTx.mockImplementation(async () => {
                callOrder.push('setLastWorkspace');
            });
            outboxService.addManyInTx.mockImplementation(async () => {
                callOrder.push('addEntries');

                return [];
            });

            const result = await useCase.execute(
                requestContext,
                apiKeyContext,
                authContext,
                userContext,
                body
            );

            expect(result).toEqual({});
            expect(callOrder).toEqual([
                'validate',
                'acceptInvite',
                'createMember',
                'cancelJoinRequest',
                'setLastWorkspace',
                'addEntries',
            ]);
            expect(
                workspaceInviteService.validateInviteForEmail
            ).toHaveBeenCalledWith('raw-token', userContext.user.email);
            expect(
                workspaceInviteService.assertInviteeNotMember
            ).not.toHaveBeenCalled();
            expect(outboxService.withTransaction).toHaveBeenCalledTimes(1);
            expect(
                workspaceInviteService.acceptPendingInTx
            ).toHaveBeenCalledWith(tx, 'invite-1', 'user-2', now);
            expect(workspaceMemberService.createInTx).toHaveBeenCalledWith(
                tx,
                'workspace-1',
                'user-2',
                'role-workspace-member',
                'user-2'
            );
            expect(
                workspaceJoinRequestService.cancelPendingByUserInTx
            ).toHaveBeenCalledWith(tx, 'workspace-1', 'user-2');
            expect(userService.setLastWorkspaceInTx).toHaveBeenCalledWith(
                tx,
                'user-2',
                'workspace-1'
            );
            expect(projectMemberService.createInTx).not.toHaveBeenCalled();
            expect(activityLogService.recordEffect).toHaveBeenNthCalledWith(
                1,
                requestContext,
                apiKeyContext,
                authContext,
                null,
                {
                    action: EnumActivityLogAction.workspaceInviteAccepted,
                    userId: 'user-2',
                    createdBy: 'user-2',
                    workspaceId: 'workspace-1',
                    metadata: { targetUserId: 'user-1' },
                }
            );
            expect(activityLogService.recordEffect).toHaveBeenNthCalledWith(
                2,
                requestContext,
                apiKeyContext,
                authContext,
                null,
                {
                    action: EnumActivityLogAction.workspaceInviteAcceptedByInvitee,
                    userId: 'user-1',
                    createdBy: 'user-2',
                    workspaceId: 'workspace-1',
                    metadata: { actorUserId: 'user-2' },
                }
            );
            expect(outboxService.addManyInTx).toHaveBeenCalledWith(tx, [
                firstEntry,
                secondEntry,
            ]);
        });

        it('creates the project membership last on the same transaction when the invite carries a project and role', async () => {
            const projectInvite: WorkspaceInvite = {
                ...invite,
                projectId: 'project-1',
                projectRoleId: 'role-project-member',
            };
            workspaceInviteService.validateInviteForEmail.mockResolvedValue(
                projectInvite
            );
            const callOrder: string[] = [];
            userService.setLastWorkspaceInTx.mockImplementation(async () => {
                callOrder.push('setLastWorkspace');
            });
            projectMemberService.createInTx.mockImplementation(async () => {
                callOrder.push('createProjectMember');

                return mock();
            });

            await useCase.execute(
                requestContext,
                apiKeyContext,
                authContext,
                userContext,
                body
            );

            expect(callOrder).toEqual([
                'setLastWorkspace',
                'createProjectMember',
            ]);
            expect(projectMemberService.createInTx).toHaveBeenCalledWith(
                tx,
                'project-1',
                'user-2',
                'role-project-member',
                'user-2'
            );
        });

        it('adds a single entry when the caller invited itself', async () => {
            workspaceInviteService.validateInviteForEmail.mockResolvedValue({
                ...invite,
                invitedByUserId: 'user-2',
            });

            await useCase.execute(
                requestContext,
                apiKeyContext,
                authContext,
                userContext,
                body
            );

            expect(activityLogService.recordEffect).toHaveBeenCalledTimes(1);
            expect(outboxService.addManyInTx).toHaveBeenCalledWith(tx, [
                firstEntry,
            ]);
        });

        it('opens no transaction when the invite validation answers the closed invitation flag', async () => {
            workspaceInviteService.validateInviteForEmail.mockRejectedValue(
                new FeatureFlagDisabledException()
            );

            await expect(
                useCase.execute(
                    requestContext,
                    apiKeyContext,
                    authContext,
                    userContext,
                    body
                )
            ).rejects.toBeInstanceOf(FeatureFlagDisabledException);
            expect(outboxService.withTransaction).not.toHaveBeenCalled();
            expect(outboxService.addManyInTx).not.toHaveBeenCalled();
        });

        it('throws WorkspaceInviteInvalidException before the transaction when the token does not resolve', async () => {
            workspaceInviteService.validateInviteForEmail.mockRejectedValue(
                new WorkspaceInviteInvalidException()
            );

            await expect(
                useCase.execute(
                    requestContext,
                    apiKeyContext,
                    authContext,
                    userContext,
                    body
                )
            ).rejects.toBeInstanceOf(WorkspaceInviteInvalidException);
            expect(outboxService.withTransaction).not.toHaveBeenCalled();
            expect(outboxService.addManyInTx).not.toHaveBeenCalled();
        });

        it('maps a unique collision on the member insert to WorkspaceMemberAlreadyExistsException and adds no entry', async () => {
            const collision = new Error('unique');
            workspaceMemberService.createInTx.mockRejectedValue(collision);
            databaseUtil.isUniqueCollision.mockReturnValue(true);

            await expect(
                useCase.execute(
                    requestContext,
                    apiKeyContext,
                    authContext,
                    userContext,
                    body
                )
            ).rejects.toMatchObject({
                constructor: WorkspaceMemberAlreadyExistsException,
                module: 'workspace',
                statusCode: EnumWorkspaceStatusCodeError.memberAlreadyExists,
                messagePath: 'workspace.error.memberAlreadyExists',
            });
            expect(databaseUtil.isUniqueCollision).toHaveBeenCalledWith(
                collision,
                'userId'
            );
            expect(outboxService.addManyInTx).not.toHaveBeenCalled();
        });

        it('answers WorkspaceInviteAlreadyProcessedException on a write conflict after the accept', async () => {
            const conflict = new Error('write-conflict');
            workspaceMemberService.createInTx.mockRejectedValue(conflict);
            databaseUtil.isUniqueCollision.mockReturnValue(false);
            databaseUtil.toException.mockReturnValue(
                new DatabaseWriteConflictException()
            );

            await expect(
                useCase.execute(
                    requestContext,
                    apiKeyContext,
                    authContext,
                    userContext,
                    body
                )
            ).rejects.toMatchObject({
                constructor: WorkspaceInviteAlreadyProcessedException,
                module: 'workspace',
                statusCode: EnumWorkspaceStatusCodeError.inviteAlreadyProcessed,
                messagePath: 'workspace.error.inviteAlreadyProcessed',
            });
            expect(workspaceInviteService.acceptPendingInTx).toHaveBeenCalled();
            expect(databaseUtil.toException).toHaveBeenCalledWith(conflict);
            expect(outboxService.addManyInTx).not.toHaveBeenCalled();
        });

        it('wraps another transaction failure in AppUnknownException and adds no entry', async () => {
            const failure = new Error('db-down');
            workspaceMemberService.createInTx.mockRejectedValue(failure);
            databaseUtil.isUniqueCollision.mockReturnValue(false);

            await expect(
                useCase.execute(
                    requestContext,
                    apiKeyContext,
                    authContext,
                    userContext,
                    body
                )
            ).rejects.toMatchObject({
                constructor: AppUnknownException,
                rawError: failure,
            });
            expect(outboxService.addManyInTx).not.toHaveBeenCalled();
        });

        it('propagates WorkspaceInviteAlreadyProcessedException from the guarded accept, writes nothing after it, and adds no entry', async () => {
            workspaceInviteService.acceptPendingInTx.mockRejectedValue(
                new WorkspaceInviteAlreadyProcessedException()
            );

            await expect(
                useCase.execute(
                    requestContext,
                    apiKeyContext,
                    authContext,
                    userContext,
                    body
                )
            ).rejects.toBeInstanceOf(WorkspaceInviteAlreadyProcessedException);
            expect(workspaceMemberService.createInTx).not.toHaveBeenCalled();
            expect(userService.setLastWorkspaceInTx).not.toHaveBeenCalled();
            expect(projectMemberService.createInTx).not.toHaveBeenCalled();
            expect(outboxService.addManyInTx).not.toHaveBeenCalled();
        });
    });
});
