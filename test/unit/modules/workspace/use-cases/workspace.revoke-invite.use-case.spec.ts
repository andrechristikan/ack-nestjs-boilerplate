import { Test } from '@nestjs/testing';
import type { TestingModule } from '@nestjs/testing';
import { mock } from 'vitest-mock-extended';
import type { MockProxy } from 'vitest-mock-extended';
import {
    EnumActivityLogAction,
    EnumUserLoginFrom,
    EnumUserLoginWith,
    EnumUserSignUpFrom,
    EnumUserSignUpWith,
    EnumUserStatus,
    EnumWorkspaceInviteStatus,
    EnumWorkspaceMemberRole,
} from '@generated/prisma-client/client';
import type { User, WorkspaceInvite } from '@generated/prisma-client/client';
import { ActivityLogService } from '@modules/activity-log/services/activity-log.service';
import type { IActivityLogStaged } from '@modules/activity-log/interfaces/activity-log.interface';
import { UserService } from '@modules/user/services/user.service';
import { WorkspaceInviteService } from '@modules/workspace/services/workspace.invite.service';
import { WorkspaceInviteAlreadyProcessedException } from '@modules/workspace/exceptions/workspace.invite-already-processed.exception';
import { WorkspaceRevokeInviteUseCase } from '@modules/workspace/use-cases/workspace.revoke-invite.use-case';

describe('WorkspaceRevokeInviteUseCase', () => {
    const workspaceInviteService: MockProxy<WorkspaceInviteService> =
        mock<WorkspaceInviteService>();
    const userService: MockProxy<UserService> = mock<UserService>();
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
    const existingUser: User = {
        id: 'user-2',
        name: 'Jane Doe',
        username: 'jane',
        isVerified: true,
        verifiedAt: new Date('2026-01-01T00:00:00.000Z'),
        email: 'invitee@example.com',
        roleId: 'role-1',
        password: null,
        passwordExpired: null,
        passwordCreated: null,
        passwordAttempt: null,
        signUpAt: new Date('2026-01-01T00:00:00.000Z'),
        signUpFrom: EnumUserSignUpFrom.website,
        signUpWith: EnumUserSignUpWith.credential,
        status: EnumUserStatus.active,
        gender: null,
        countryId: 'country-1',
        lastLoginAt: null,
        lastIPAddress: null,
        lastLoginFrom: EnumUserLoginFrom.website,
        lastLoginWith: EnumUserLoginWith.credential,
        lastWorkspaceId: null,
        lastWorkspaceChangedAt: null,
        photo: null,
        createdAt: new Date('2026-01-01T00:00:00.000Z'),
        createdBy: null,
        updatedAt: new Date('2026-01-01T00:00:00.000Z'),
        updatedBy: null,
        deletedAt: null,
        deletedBy: null,
    };
    const stagedActivityLog: IActivityLogStaged = {
        action: EnumActivityLogAction.workspaceInviteCreated,
        metadata: {},
        userId: null,
        createdBy: null,
        workspaceId: null,
    };
    let useCase: WorkspaceRevokeInviteUseCase;

    beforeEach(async () => {
        vi.resetAllMocks();
        activityLogService.prepare.mockReturnValue(stagedActivityLog);

        const module: TestingModule = await Test.createTestingModule({
            providers: [
                WorkspaceRevokeInviteUseCase,
                {
                    provide: WorkspaceInviteService,
                    useValue: workspaceInviteService,
                },
                { provide: UserService, useValue: userService },
                { provide: ActivityLogService, useValue: activityLogService },
            ],
        }).compile();

        useCase = module.get(WorkspaceRevokeInviteUseCase);
    });

    describe('execute', () => {
        beforeEach(() => {
            workspaceInviteService.getPendingById.mockResolvedValue(invite);
            userService.getOneActiveByEmail.mockResolvedValue(null);
        });

        it('reads the pending invite and the invitee, prepares the row, revokes, and stages in order', async () => {
            const callOrder: string[] = [];
            workspaceInviteService.getPendingById.mockImplementation(
                async () => {
                    callOrder.push('pending');

                    return invite;
                }
            );
            userService.getOneActiveByEmail.mockImplementation(async () => {
                callOrder.push('lookup');

                return null;
            });
            activityLogService.prepare.mockImplementation(() => {
                callOrder.push('prepare');

                return stagedActivityLog;
            });
            workspaceInviteService.revokeInvite.mockImplementation(async () => {
                callOrder.push('revoke');
            });
            activityLogService.stagePrepared.mockImplementation(() => {
                callOrder.push('stage');
            });

            const result = await useCase.execute(
                'workspace-1',
                'user-1',
                'invite-1'
            );

            expect(result).toEqual({});
            expect(callOrder).toEqual([
                'pending',
                'lookup',
                'prepare',
                'revoke',
                'stage',
            ]);
            expect(workspaceInviteService.getPendingById).toHaveBeenCalledWith(
                'invite-1',
                'workspace-1'
            );
            expect(workspaceInviteService.revokeInvite).toHaveBeenCalledWith(
                'invite-1'
            );
            expect(activityLogService.prepare).toHaveBeenCalledTimes(1);
            expect(activityLogService.prepare).toHaveBeenCalledWith({
                action: EnumActivityLogAction.workspaceInviteRevoked,
                userId: 'user-1',
                createdBy: 'user-1',
                workspaceId: 'workspace-1',
                metadata: { workspaceInviteId: 'invite-1' },
            });
        });

        it('stages two rows when the existing user differs from the actor', async () => {
            userService.getOneActiveByEmail.mockResolvedValue(existingUser);

            await useCase.execute('workspace-1', 'user-1', 'invite-1');

            expect(activityLogService.prepare).toHaveBeenNthCalledWith(1, {
                action: EnumActivityLogAction.workspaceInviteRevoked,
                userId: 'user-1',
                createdBy: 'user-1',
                workspaceId: 'workspace-1',
                metadata: {
                    workspaceInviteId: 'invite-1',
                    targetUserId: 'user-2',
                },
            });
            expect(activityLogService.prepare).toHaveBeenNthCalledWith(2, {
                action: EnumActivityLogAction.workspaceInviteRevokedByAdmin,
                userId: 'user-2',
                createdBy: 'user-1',
                workspaceId: 'workspace-1',
                metadata: { actorUserId: 'user-1' },
            });
            expect(activityLogService.stagePrepared).toHaveBeenCalledWith([
                stagedActivityLog,
                stagedActivityLog,
            ]);
        });

        it('stages a single row when the existing user is the actor', async () => {
            userService.getOneActiveByEmail.mockResolvedValue(existingUser);

            await useCase.execute('workspace-1', 'user-2', 'invite-1');

            expect(activityLogService.prepare).toHaveBeenCalledTimes(1);
        });

        it('looks up no invitee when the invite is not pending', async () => {
            workspaceInviteService.getPendingById.mockRejectedValue(
                new WorkspaceInviteAlreadyProcessedException()
            );

            await expect(
                useCase.execute('workspace-1', 'user-1', 'invite-1')
            ).rejects.toBeInstanceOf(WorkspaceInviteAlreadyProcessedException);
            expect(userService.getOneActiveByEmail).not.toHaveBeenCalled();
        });

        it('stages nothing when the guarded revoke rejects', async () => {
            workspaceInviteService.revokeInvite.mockRejectedValue(
                new WorkspaceInviteAlreadyProcessedException()
            );

            await expect(
                useCase.execute('workspace-1', 'user-1', 'invite-1')
            ).rejects.toBeInstanceOf(WorkspaceInviteAlreadyProcessedException);
            expect(activityLogService.stagePrepared).not.toHaveBeenCalled();
        });
    });
});
