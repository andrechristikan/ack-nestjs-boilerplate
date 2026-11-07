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
import {
    EnumActivityLogAction,
    EnumProjectMemberRole,
    EnumWorkspaceInviteStatus,
    EnumWorkspaceMemberRole,
} from '@generated/prisma-client/client';
import type {
    WorkspaceInvite,
    WorkspaceMember,
} from '@generated/prisma-client/client';
import { ActivityLogService } from '@modules/activity-log/services/activity-log.service';
import type { IActivityLogStaged } from '@modules/activity-log/interfaces/activity-log.interface';
import { FeatureFlagDisabledException } from '@modules/feature-flag/exceptions/feature-flag.disabled.exception';
import { ProjectMemberService } from '@modules/project/services/project.member.service';
import { UserService } from '@modules/user/services/user.service';
import type { WorkspaceInviteClaimRequestDto } from '@modules/workspace/dtos/request/workspace.invite-claim.request.dto';
import { WorkspaceInviteService } from '@modules/workspace/services/workspace.invite.service';
import { WorkspaceMemberService } from '@modules/workspace/services/workspace.member.service';
import { EnumWorkspaceStatusCodeError } from '@modules/workspace/enums/workspace.status-code.enum';
import { WorkspaceInviteAlreadyProcessedException } from '@modules/workspace/exceptions/workspace.invite-already-processed.exception';
import { WorkspaceInviteInvalidException } from '@modules/workspace/exceptions/workspace.invite-invalid.exception';
import { WorkspaceClaimInviteUseCase } from '@modules/workspace/use-cases/workspace.claim-invite.use-case';

describe('WorkspaceClaimInviteUseCase', () => {
    const workspaceInviteService: MockProxy<WorkspaceInviteService> =
        mock<WorkspaceInviteService>();
    const workspaceMemberService: MockProxy<WorkspaceMemberService> =
        mock<WorkspaceMemberService>();
    const projectMemberService: MockProxy<ProjectMemberService> =
        mock<ProjectMemberService>();
    const userService: MockProxy<UserService> = mock<UserService>();
    const databaseService: MockProxy<DatabaseService> = mock<DatabaseService>();
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
        workspaceRole: EnumWorkspaceMemberRole.member,
        projectId: null,
        projectRole: null,
        reference: 'WIN-abc123',
        expiredAt: new Date('2026-02-01T00:00:00.000Z'),
        status: EnumWorkspaceInviteStatus.pending,
        invitedByUserId: 'user-1',
        acceptedAt: null,
        acceptedByUserId: null,
        nonce: 'aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa',
    };
    const existingMember: WorkspaceMember = {
        id: 'member-1',
        createdAt: new Date('2026-01-01T00:00:00.000Z'),
        createdBy: null,
        updatedAt: new Date('2026-01-01T00:00:00.000Z'),
        updatedBy: null,
        workspaceId: 'workspace-1',
        userId: 'user-2',
        role: EnumWorkspaceMemberRole.member,
        joinedAt: new Date('2026-01-01T00:00:00.000Z'),
    };
    const tx: IDatabaseTransactionClient = mock<IDatabaseTransactionClient>();
    const now = new Date('2026-01-01T00:00:00.000Z');
    const stagedActivityLog: IActivityLogStaged = {
        action: EnumActivityLogAction.workspaceInviteCreated,
        metadata: {},
        userId: null,
        createdBy: null,
        workspaceId: null,
    };
    let useCase: WorkspaceClaimInviteUseCase;

    beforeEach(async () => {
        vi.resetAllMocks();
        activityLogService.prepare.mockReturnValue(stagedActivityLog);
        helperDateService.create.mockReturnValue(now);
        databaseService.withTransaction.mockImplementation(async fn => fn(tx));

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
                    provide: ProjectMemberService,
                    useValue: projectMemberService,
                },
                { provide: UserService, useValue: userService },
                { provide: DatabaseService, useValue: databaseService },
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

        it('validates, accepts the invite before the member insert on one transaction, then stages the accepted rows', async () => {
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
            userService.setLastWorkspaceInTx.mockImplementation(async () => {
                callOrder.push('setLastWorkspace');
            });
            activityLogService.stagePrepared.mockImplementation(() => {
                callOrder.push('stage');
            });

            const result = await useCase.execute(
                'user-2',
                'invitee@example.com',
                body
            );

            expect(result).toEqual({});
            expect(callOrder).toEqual([
                'validate',
                'acceptInvite',
                'createMember',
                'setLastWorkspace',
                'stage',
            ]);
            expect(
                workspaceInviteService.validateInviteForEmail
            ).toHaveBeenCalledWith('raw-token', 'invitee@example.com');
            expect(
                workspaceInviteService.assertInviteeNotMember
            ).not.toHaveBeenCalled();
            expect(databaseService.withTransaction).toHaveBeenCalledTimes(1);
            expect(
                workspaceInviteService.acceptPendingInTx
            ).toHaveBeenCalledWith(tx, 'invite-1', 'user-2', now);
            expect(workspaceMemberService.createInTx).toHaveBeenCalledWith(
                tx,
                'workspace-1',
                'user-2',
                EnumWorkspaceMemberRole.member,
                'user-2'
            );
            expect(userService.setLastWorkspaceInTx).toHaveBeenCalledWith(
                tx,
                'user-2',
                'workspace-1'
            );
            expect(projectMemberService.createInTx).not.toHaveBeenCalled();
            expect(activityLogService.prepare).toHaveBeenNthCalledWith(1, {
                action: EnumActivityLogAction.workspaceInviteAccepted,
                userId: 'user-2',
                createdBy: 'user-2',
                workspaceId: 'workspace-1',
                metadata: { targetUserId: 'user-1' },
            });
            expect(activityLogService.prepare).toHaveBeenNthCalledWith(2, {
                action: EnumActivityLogAction.workspaceInviteAcceptedByInvitee,
                userId: 'user-1',
                createdBy: 'user-2',
                workspaceId: 'workspace-1',
                metadata: { actorUserId: 'user-2' },
            });
            expect(activityLogService.stagePrepared).toHaveBeenCalledWith([
                stagedActivityLog,
                stagedActivityLog,
            ]);
        });

        it('prepares both accepted rows before the transaction opens and stages them after it commits', async () => {
            databaseService.withTransaction.mockImplementation(async fn => {
                expect(activityLogService.prepare).toHaveBeenCalledTimes(2);
                expect(activityLogService.stagePrepared).not.toHaveBeenCalled();

                return fn(tx) as never;
            });

            await useCase.execute('user-2', 'invitee@example.com', body);

            expect(databaseService.withTransaction).toHaveBeenCalledTimes(1);
            expect(activityLogService.stagePrepared).toHaveBeenCalledWith([
                stagedActivityLog,
                stagedActivityLog,
            ]);
        });

        it('creates the project membership last on the same transaction when the invite carries a project and role', async () => {
            const projectInvite: WorkspaceInvite = {
                ...invite,
                projectId: 'project-1',
                projectRole: EnumProjectMemberRole.member,
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

            await useCase.execute('user-2', 'invitee@example.com', body);

            expect(callOrder).toEqual([
                'setLastWorkspace',
                'createProjectMember',
            ]);
            expect(projectMemberService.createInTx).toHaveBeenCalledWith(
                tx,
                'project-1',
                'user-2',
                EnumProjectMemberRole.member,
                'user-2'
            );
        });

        it('stages a single row when the caller invited itself', async () => {
            workspaceInviteService.validateInviteForEmail.mockResolvedValue({
                ...invite,
                invitedByUserId: 'user-2',
            });

            await useCase.execute('user-2', 'invitee@example.com', body);

            expect(activityLogService.prepare).toHaveBeenCalledTimes(1);
            expect(activityLogService.stagePrepared).toHaveBeenCalledWith([
                stagedActivityLog,
            ]);
        });

        it('opens no transaction when the invite validation answers the closed invitation flag', async () => {
            workspaceInviteService.validateInviteForEmail.mockRejectedValue(
                new FeatureFlagDisabledException()
            );

            await expect(
                useCase.execute('user-2', 'invitee@example.com', body)
            ).rejects.toBeInstanceOf(FeatureFlagDisabledException);
            expect(databaseService.withTransaction).not.toHaveBeenCalled();
            expect(activityLogService.stagePrepared).not.toHaveBeenCalled();
        });

        it('throws WorkspaceInviteInvalidException before the transaction when the token does not resolve', async () => {
            workspaceInviteService.validateInviteForEmail.mockRejectedValue(
                new WorkspaceInviteInvalidException()
            );

            await expect(
                useCase.execute('user-2', 'invitee@example.com', body)
            ).rejects.toBeInstanceOf(WorkspaceInviteInvalidException);
            expect(databaseService.withTransaction).not.toHaveBeenCalled();
            expect(activityLogService.stagePrepared).not.toHaveBeenCalled();
        });

        it('maps a unique collision on the member insert to WorkspaceInviteAlreadyProcessedException and stages nothing', async () => {
            const collision = new Error('unique');
            workspaceMemberService.createInTx.mockRejectedValue(collision);
            databaseUtil.isUniqueCollision.mockReturnValue(true);

            await expect(
                useCase.execute('user-2', 'invitee@example.com', body)
            ).rejects.toMatchObject({
                constructor: WorkspaceInviteAlreadyProcessedException,
                module: 'workspace',
                statusCode: EnumWorkspaceStatusCodeError.inviteAlreadyProcessed,
                messagePath: 'workspace.error.inviteAlreadyProcessed',
            });
            expect(databaseUtil.isUniqueCollision).toHaveBeenCalledWith(
                collision,
                'userId'
            );
            expect(activityLogService.stagePrepared).not.toHaveBeenCalled();
        });

        it('answers WorkspaceInviteAlreadyProcessedException on a write conflict after the accept', async () => {
            const conflict = new Error('write-conflict');
            workspaceMemberService.createInTx.mockRejectedValue(conflict);
            databaseUtil.isUniqueCollision.mockReturnValue(false);
            databaseUtil.toException.mockReturnValue(
                new DatabaseWriteConflictException()
            );

            await expect(
                useCase.execute('user-2', 'invitee@example.com', body)
            ).rejects.toMatchObject({
                constructor: WorkspaceInviteAlreadyProcessedException,
                module: 'workspace',
                statusCode: EnumWorkspaceStatusCodeError.inviteAlreadyProcessed,
                messagePath: 'workspace.error.inviteAlreadyProcessed',
            });
            expect(workspaceInviteService.acceptPendingInTx).toHaveBeenCalled();
            expect(databaseUtil.toException).toHaveBeenCalledWith(conflict);
            expect(activityLogService.stagePrepared).not.toHaveBeenCalled();
        });

        it('wraps another transaction failure in AppUnknownException and stages nothing', async () => {
            const failure = new Error('db-down');
            workspaceMemberService.createInTx.mockRejectedValue(failure);
            databaseUtil.isUniqueCollision.mockReturnValue(false);

            await expect(
                useCase.execute('user-2', 'invitee@example.com', body)
            ).rejects.toMatchObject({
                constructor: AppUnknownException,
                rawError: failure,
            });
            expect(activityLogService.stagePrepared).not.toHaveBeenCalled();
        });

        it('propagates WorkspaceInviteAlreadyProcessedException from the guarded accept, writes nothing after it, and stages nothing', async () => {
            workspaceInviteService.acceptPendingInTx.mockRejectedValue(
                new WorkspaceInviteAlreadyProcessedException()
            );

            await expect(
                useCase.execute('user-2', 'invitee@example.com', body)
            ).rejects.toBeInstanceOf(WorkspaceInviteAlreadyProcessedException);
            expect(workspaceMemberService.createInTx).not.toHaveBeenCalled();
            expect(userService.setLastWorkspaceInTx).not.toHaveBeenCalled();
            expect(projectMemberService.createInTx).not.toHaveBeenCalled();
            expect(activityLogService.stagePrepared).not.toHaveBeenCalled();
        });
    });
});
