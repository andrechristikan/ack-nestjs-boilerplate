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
import { NotificationService } from '@modules/notification/services/notification.service';
import { EnumNotificationKind } from '@modules/notification/enums/notification.enum';
import type {
    INotificationRecipient,
    INotificationWorkspaceInvitePushPayload,
} from '@modules/notification/interfaces/notification.interface';
import { NotificationEmailQueue } from '@modules/notification/queues/notification.email.queue';
import { NotificationQueue } from '@modules/notification/queues/notification.queue';
import { UserService } from '@modules/user/services/user.service';
import type { WorkspaceInviteResendRequestDto } from '@modules/workspace/dtos/request/workspace.invite-resend.request.dto';
import { WorkspaceInviteService } from '@modules/workspace/services/workspace.invite.service';
import { WorkspaceInviteAlreadyProcessedException } from '@modules/workspace/exceptions/workspace.invite-already-processed.exception';
import { WorkspaceInviteNotFoundException } from '@modules/workspace/exceptions/workspace.invite-not-found.exception';
import type { IWorkspaceInviteTokenData } from '@modules/workspace/interfaces/workspace.interface';
import { WorkspaceUtil } from '@modules/workspace/utils/workspace.util';
import { TestRecipient } from '@test/unit/helpers/test.unit.notification-push.helper';
import { WorkspaceResendInviteUseCase } from '@modules/workspace/use-cases/workspace.resend-invite.use-case';

describe('WorkspaceResendInviteUseCase', () => {
    const workspaceInviteService: MockProxy<WorkspaceInviteService> =
        mock<WorkspaceInviteService>();
    const userService: MockProxy<UserService> = mock<UserService>();
    const notificationService: MockProxy<NotificationService> =
        mock<NotificationService>();
    const activityLogService: MockProxy<ActivityLogService> =
        mock<ActivityLogService>();
    const notificationQueue: MockProxy<NotificationQueue> =
        mock<NotificationQueue>();
    const notificationEmailQueue: MockProxy<NotificationEmailQueue> =
        mock<NotificationEmailQueue>();
    const workspaceUtil: MockProxy<WorkspaceUtil> = mock<WorkspaceUtil>();
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
    const payload: INotificationWorkspaceInvitePushPayload = {
        workspaceId: 'workspace-1',
        workspaceName: 'Acme',
        inviterName: 'Jane Doe',
        workspaceMemberRole: EnumWorkspaceMemberRole.member,
        reference: 'WIN-abc123',
        expiredAt: '2026-02-01T00:00:00.000Z',
    };
    const recipient: INotificationRecipient = {
        ...TestRecipient,
        userId: 'user-2',
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
                { provide: NotificationService, useValue: notificationService },
                { provide: ActivityLogService, useValue: activityLogService },
                { provide: NotificationQueue, useValue: notificationQueue },
                {
                    provide: NotificationEmailQueue,
                    useValue: notificationEmailQueue,
                },
                { provide: WorkspaceUtil, useValue: workspaceUtil },
            ],
        }).compile();

        useCase = module.get(WorkspaceResendInviteUseCase);
    });

    describe('execute', () => {
        const body: WorkspaceInviteResendRequestDto = {};

        beforeEach(() => {
            workspaceInviteService.getResendableById.mockResolvedValue(invite);
            userService.getOneActiveByEmail.mockResolvedValue(null);
            userService.getNameById.mockResolvedValue(null);
            workspaceUtil.resolveInviterName.mockReturnValue('Acme');
            workspaceUtil.mapInviteNotificationPayload.mockReturnValue(payload);
            workspaceInviteService.resendInvite.mockResolvedValue({
                invite,
                tokenData,
            });
            notificationService.getRecipient.mockResolvedValue(recipient);
        });

        it('reads the pending invite, prepares the row, rotates, stages, and emails an unregistered invitee in order', async () => {
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
            notificationEmailQueue.sendWorkspaceInviteUnregistered.mockImplementation(
                async () => {
                    callOrder.push('email');
                }
            );

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
                'email',
            ]);
            expect(
                workspaceInviteService.getResendableById
            ).toHaveBeenCalledWith('invite-1', 'workspace-1');
            expect(userService.getOneActiveByEmail).toHaveBeenCalledWith(
                'invitee@example.com'
            );
            expect(workspaceInviteService.resendInvite).toHaveBeenCalledWith(
                'invite-1',
                null
            );
            expect(activityLogService.prepare).toHaveBeenCalledWith({
                action: EnumActivityLogAction.workspaceInviteResent,
                userId: 'user-1',
                createdBy: 'user-1',
                workspaceId: 'workspace-1',
                metadata: { workspaceInviteId: 'invite-1' },
            });
            expect(
                notificationEmailQueue.sendWorkspaceInviteUnregistered
            ).toHaveBeenCalledWith('invitee@example.com', {
                ...payload,
                inviteAcceptLink: tokenData.signUpLink,
            });
        });

        it('forwards the requested expiry to the domain', async () => {
            await useCase.execute(workspace, 'user-1', 'invite-1', {
                expiryDuration: 14,
            } as WorkspaceInviteResendRequestDto);

            expect(workspaceInviteService.resendInvite).toHaveBeenCalledWith(
                'invite-1',
                14
            );
        });

        it('emails the token data the domain stored', async () => {
            const storedTokenData: IWorkspaceInviteTokenData = {
                ...tokenData,
                signUpLink: 'https://app.example.com/sign-up/retried-token',
            };
            workspaceInviteService.resendInvite.mockResolvedValue({
                invite,
                tokenData: storedTokenData,
            });

            await useCase.execute(workspace, 'user-1', 'invite-1', body);

            expect(
                notificationEmailQueue.sendWorkspaceInviteUnregistered
            ).toHaveBeenCalledWith('invitee@example.com', {
                ...payload,
                inviteAcceptLink: storedTokenData.signUpLink,
            });
        });

        it('stages the actor row and the invitee row and notifies the in-app recipient when the invitee differs from the actor', async () => {
            userService.getOneActiveByEmail.mockResolvedValue(existingUser);

            await useCase.execute(workspace, 'user-1', 'invite-1', body);

            expect(notificationService.getRecipient).toHaveBeenCalledWith(
                existingUser,
                EnumNotificationKind.workspaceInvite
            );
            expect(activityLogService.prepare).toHaveBeenNthCalledWith(2, {
                action: EnumActivityLogAction.workspaceInviteResentByAdmin,
                userId: 'user-2',
                createdBy: 'user-1',
                workspaceId: 'workspace-1',
                metadata: { actorUserId: 'user-1' },
            });
            expect(notificationQueue.sendWorkspaceInvite).toHaveBeenCalledWith(
                recipient,
                { ...payload, inviteAcceptLink: tokenData.claimLink },
                'user-1'
            );
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

        it('rotates nothing when the invitee recipient read rejects', async () => {
            const failure = new Error('read-failed');
            userService.getOneActiveByEmail.mockResolvedValue(existingUser);
            notificationService.getRecipient.mockRejectedValue(failure);

            await expect(
                useCase.execute(workspace, 'user-1', 'invite-1', body)
            ).rejects.toBe(failure);
            expect(workspaceInviteService.resendInvite).not.toHaveBeenCalled();
        });

        it('rotates nothing when the inviter name read rejects', async () => {
            const failure = new Error('read-failed');
            userService.getNameById.mockRejectedValue(failure);

            await expect(
                useCase.execute(workspace, 'user-1', 'invite-1', body)
            ).rejects.toBe(failure);
            expect(workspaceInviteService.resendInvite).not.toHaveBeenCalled();
        });

        it('stages nothing and notifies nobody when the rotation rejects', async () => {
            workspaceInviteService.resendInvite.mockRejectedValue(
                new WorkspaceInviteAlreadyProcessedException()
            );

            await expect(
                useCase.execute(workspace, 'user-1', 'invite-1', body)
            ).rejects.toBeInstanceOf(WorkspaceInviteAlreadyProcessedException);
            expect(activityLogService.stagePrepared).not.toHaveBeenCalled();
            expect(
                notificationEmailQueue.sendWorkspaceInviteUnregistered
            ).not.toHaveBeenCalled();
        });
    });
});
