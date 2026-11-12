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
import type {
    User,
    Workspace,
    WorkspaceInvite,
} from '@generated/prisma-client/client';
import { ActivityLogService } from '@modules/activity-log/services/activity-log.service';
import type { IActivityLogStaged } from '@modules/activity-log/interfaces/activity-log.interface';
import { UserService } from '@modules/user/services/user.service';
import type { WorkspaceInviteResendRequestDto } from '@modules/workspace/dtos/request/workspace.invite-resend.request.dto';
import { WorkspaceInviteService } from '@modules/workspace/services/workspace.invite.service';
import { WorkspaceInviteAlreadyProcessedException } from '@modules/workspace/exceptions/workspace.invite-already-processed.exception';
import { WorkspaceInviteNotFoundException } from '@modules/workspace/exceptions/workspace.invite-not-found.exception';
import type {
    IWorkspaceInviteNotice,
    IWorkspaceInviteTokenData,
} from '@modules/workspace/interfaces/workspace.interface';
import { WorkspaceResendInviteUseCase } from '@modules/workspace/use-cases/workspace.resend-invite.use-case';

describe('WorkspaceResendInviteUseCase', () => {
    const workspaceInviteService: MockProxy<WorkspaceInviteService> =
        mock<WorkspaceInviteService>();
    const userService: MockProxy<UserService> = mock<UserService>();
    const activityLogService: MockProxy<ActivityLogService> =
        mock<ActivityLogService>();
    const workspace: Workspace = {
        id: 'workspace-1',
        createdAt: new Date('2026-01-01T00:00:00.000Z'),
        createdBy: 'user-1',
        updatedAt: new Date('2026-01-01T00:00:00.000Z'),
        updatedBy: 'user-1',
        deletedAt: null,
        deletedBy: null,
        name: 'Acme',
        slug: 'acme-team',
        description: null,
        isPublic: false,
    };
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
    const tokenData: IWorkspaceInviteTokenData = {
        token: 'token-value',
        hashedToken: 'hashed-token',
        reference: 'WIN-abc123',
        expiredAt: new Date('2026-02-01T00:00:00.000Z'),
        claimLink:
            'https://app.example.com/workspace/invites?inviteToken=token-value',
        signUpLink: 'https://app.example.com/sign-up/token-value',
    };
    const notice: IWorkspaceInviteNotice = {
        workspaceName: 'Acme',
        inviterName: 'Jane Doe',
        inviteeUserId: null,
    };
    const stagedActivityLog: IActivityLogStaged = {
        action: EnumActivityLogAction.workspaceInviteCreated,
        metadata: {},
        userId: null,
        createdBy: null,
        workspaceId: null,
    };
    let useCase: WorkspaceResendInviteUseCase;

    beforeEach(async () => {
        vi.resetAllMocks();
        activityLogService.prepare.mockReturnValue(stagedActivityLog);

        const module: TestingModule = await Test.createTestingModule({
            providers: [
                WorkspaceResendInviteUseCase,
                {
                    provide: WorkspaceInviteService,
                    useValue: workspaceInviteService,
                },
                { provide: UserService, useValue: userService },
                { provide: ActivityLogService, useValue: activityLogService },
            ],
        }).compile();

        useCase = module.get(WorkspaceResendInviteUseCase);
    });

    describe('execute', () => {
        const body: WorkspaceInviteResendRequestDto = {};

        beforeEach(() => {
            workspaceInviteService.getResendableById.mockResolvedValue(invite);
            userService.getOneActiveByEmail.mockResolvedValue(null);
            workspaceInviteService.getInviterName.mockResolvedValue('Jane Doe');
            workspaceInviteService.resendInvite.mockResolvedValue({
                invite,
                tokenData,
            });
        });

        it('reads the pending invite, prepares the row, rotates with the notice for an invitee with no account, then stages in order', async () => {
            const callOrder: string[] = [];
            workspaceInviteService.getResendableById.mockImplementation(
                async () => {
                    callOrder.push('pending');

                    return invite;
                }
            );
            activityLogService.prepare.mockImplementation(() => {
                callOrder.push('prepare');

                return stagedActivityLog;
            });
            workspaceInviteService.resendInvite.mockImplementation(async () => {
                callOrder.push('rotate');

                return { invite, tokenData };
            });
            activityLogService.stagePrepared.mockImplementation(() => {
                callOrder.push('stage');
            });

            const result = await useCase.execute(
                workspace,
                'user-1',
                'invite-1',
                body
            );

            expect(result).toEqual({ data: invite });
            expect(callOrder).toEqual([
                'pending',
                'prepare',
                'rotate',
                'stage',
            ]);
            expect(
                workspaceInviteService.getResendableById
            ).toHaveBeenCalledWith('invite-1', 'workspace-1');
            expect(userService.getOneActiveByEmail).toHaveBeenCalledWith(
                'invitee@example.com'
            );
            expect(workspaceInviteService.resendInvite).toHaveBeenCalledWith(
                'invite-1',
                null,
                'user-1',
                notice
            );
            expect(activityLogService.prepare).toHaveBeenCalledWith({
                action: EnumActivityLogAction.workspaceInviteResent,
                userId: 'user-1',
                createdBy: 'user-1',
                workspaceId: 'workspace-1',
                metadata: { workspaceInviteId: 'invite-1' },
            });
        });

        it('forwards the requested expiry to the domain', async () => {
            await useCase.execute(workspace, 'user-1', 'invite-1', {
                expiryDuration: 14,
            } as WorkspaceInviteResendRequestDto);

            expect(workspaceInviteService.resendInvite).toHaveBeenCalledWith(
                'invite-1',
                14,
                'user-1',
                notice
            );
        });

        it('passes the invitee user id and stages the actor row and the invitee row when the invitee differs from the actor', async () => {
            userService.getOneActiveByEmail.mockResolvedValue(existingUser);

            await useCase.execute(workspace, 'user-1', 'invite-1', body);

            expect(workspaceInviteService.resendInvite).toHaveBeenCalledWith(
                'invite-1',
                null,
                'user-1',
                { ...notice, inviteeUserId: 'user-2' }
            );
            expect(activityLogService.prepare).toHaveBeenNthCalledWith(2, {
                action: EnumActivityLogAction.workspaceInviteResentByAdmin,
                userId: 'user-2',
                createdBy: 'user-1',
                workspaceId: 'workspace-1',
                metadata: { actorUserId: 'user-1' },
            });
        });

        it('stages only the actor row when the invitee account is the actor', async () => {
            userService.getOneActiveByEmail.mockResolvedValue(existingUser);

            await useCase.execute(workspace, 'user-2', 'invite-1', body);

            expect(activityLogService.prepare).toHaveBeenCalledTimes(1);
        });

        it('rotates nothing when the invite is not pending', async () => {
            workspaceInviteService.getResendableById.mockRejectedValue(
                new WorkspaceInviteNotFoundException()
            );

            await expect(
                useCase.execute(workspace, 'user-1', 'invite-1', body)
            ).rejects.toBeInstanceOf(WorkspaceInviteNotFoundException);
            expect(workspaceInviteService.resendInvite).not.toHaveBeenCalled();
        });

        it('rotates nothing when the inviter name read rejects', async () => {
            const failure = new Error('read-failed');
            workspaceInviteService.getInviterName.mockRejectedValue(failure);

            await expect(
                useCase.execute(workspace, 'user-1', 'invite-1', body)
            ).rejects.toBe(failure);
            expect(workspaceInviteService.resendInvite).not.toHaveBeenCalled();
        });

        it('stages nothing when the rotation rejects', async () => {
            workspaceInviteService.resendInvite.mockRejectedValue(
                new WorkspaceInviteAlreadyProcessedException()
            );

            await expect(
                useCase.execute(workspace, 'user-1', 'invite-1', body)
            ).rejects.toBeInstanceOf(WorkspaceInviteAlreadyProcessedException);
            expect(activityLogService.stagePrepared).not.toHaveBeenCalled();
        });
    });
});
