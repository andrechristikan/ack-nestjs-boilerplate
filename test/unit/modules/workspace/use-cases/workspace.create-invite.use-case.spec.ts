import { Test } from '@nestjs/testing';
import type { TestingModule } from '@nestjs/testing';
import { mock } from 'vitest-mock-extended';
import type { MockProxy } from 'vitest-mock-extended';
import {
    EnumActivityLogAction,
    EnumProjectMemberRole,
    EnumUserLoginFrom,
    EnumUserLoginWith,
    EnumUserSignUpFrom,
    EnumUserSignUpWith,
    EnumUserStatus,
    EnumWorkspaceInviteStatus,
    EnumWorkspaceMemberRole,
} from '@generated/prisma-client/client';
import type {
    Project,
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
import { ProjectService } from '@modules/project/services/project.service';
import { UserService } from '@modules/user/services/user.service';
import type { WorkspaceInviteCreateRequestDto } from '@modules/workspace/dtos/request/workspace.invite-create.request.dto';
import { WorkspaceInviteService } from '@modules/workspace/services/workspace.invite.service';
import { WorkspaceInviteDuplicateException } from '@modules/workspace/exceptions/workspace.invite-duplicate.exception';
import { WorkspaceInviteRoleRequiredException } from '@modules/workspace/exceptions/workspace.invite-role-required.exception';
import { WorkspaceInviteProjectMismatchException } from '@modules/workspace/exceptions/workspace.invite-project-mismatch.exception';
import { WorkspaceMemberAlreadyExistsException } from '@modules/workspace/exceptions/workspace.member-already-exists.exception';
import type { IWorkspaceInviteTokenData } from '@modules/workspace/interfaces/workspace.interface';
import { WorkspaceUtil } from '@modules/workspace/utils/workspace.util';
import { buildDeferred } from '@test/unit/helpers/test.unit.deferred.helper';
import { TestRecipient } from '@test/unit/helpers/test.unit.notification-push.helper';
import { WorkspaceCreateInviteUseCase } from '@modules/workspace/use-cases/workspace.create-invite.use-case';

describe('WorkspaceCreateInviteUseCase', () => {
    const workspaceInviteService: MockProxy<WorkspaceInviteService> =
        mock<WorkspaceInviteService>();
    const projectService: MockProxy<ProjectService> = mock<ProjectService>();
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
    const project: Project = {
        id: 'project-1',
        workspaceId: 'workspace-1',
        name: 'Launch',
        slug: 'launch',
        description: null,
        createdAt: new Date('2026-01-01T00:00:00.000Z'),
        createdBy: 'user-1',
        updatedAt: new Date('2026-01-01T00:00:00.000Z'),
        updatedBy: 'user-1',
        deletedAt: null,
        deletedBy: null,
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
    let useCase: WorkspaceCreateInviteUseCase;

    beforeEach(async () => {
        vi.resetAllMocks();
        activityLogService.prepare.mockReturnValue(stagedActivityLog);

        const module: TestingModule = await Test.createTestingModule({
            providers: [
                WorkspaceCreateInviteUseCase,
                {
                    provide: WorkspaceInviteService,
                    useValue: workspaceInviteService,
                },
                { provide: ProjectService, useValue: projectService },
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

        useCase = module.get(WorkspaceCreateInviteUseCase);
    });

    describe('execute', () => {
        const body: WorkspaceInviteCreateRequestDto = {
            email: 'invitee@example.com' as Lowercase<string>,
            workspaceRole: EnumWorkspaceMemberRole.member,
        };
        beforeEach(() => {
            userService.getOneActiveByEmail.mockResolvedValue(null);
            userService.getNameById.mockResolvedValue({
                name: 'Jane Doe',
                username: 'jane',
            });
            workspaceUtil.resolveInviterName.mockReturnValue('Jane Doe');
            workspaceUtil.mapInviteNotificationPayload.mockReturnValue(payload);
            workspaceInviteService.createInvite.mockResolvedValue({
                invite,
                tokenData,
            });
            notificationService.getRecipient.mockResolvedValue(recipient);
        });

        it('checks, reads the inviter and invitee, writes, stages, and emails an unregistered invitee in order', async () => {
            const callOrder: string[] = [];
            userService.getOneActiveByEmail.mockImplementation(async () => {
                callOrder.push('lookup');

                return null;
            });
            workspaceInviteService.assertProjectRolePaired.mockImplementation(
                async () => {
                    callOrder.push('paired');
                }
            );
            workspaceInviteService.assertCreatable.mockImplementation(() => {
                callOrder.push('assertCreatable');
            });
            userService.getNameById.mockImplementation(async () => {
                callOrder.push('inviterName');

                return { name: 'Jane Doe', username: 'jane' };
            });
            workspaceInviteService.createInvite.mockImplementation(async () => {
                callOrder.push('create');

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

            const result = await useCase.execute(workspace, 'user-1', body);

            expect(result).toEqual({ data: invite });
            expect(callOrder[0]).toBe('paired');
            expect(callOrder.indexOf('assertCreatable')).toBeGreaterThan(
                callOrder.indexOf('lookup')
            );
            expect(callOrder.indexOf('inviterName')).toBeGreaterThan(
                callOrder.indexOf('assertCreatable')
            );
            expect(callOrder.slice(-3)).toEqual(['create', 'stage', 'email']);
            expect(
                projectService.getActiveByIdAndWorkspace
            ).not.toHaveBeenCalled();
            expect(userService.getOneActiveByEmail).toHaveBeenCalledWith(
                'invitee@example.com'
            );
            expect(workspaceInviteService.assertCreatable).toHaveBeenCalledWith(
                {
                    email: 'invitee@example.com',
                    workspaceRole: EnumWorkspaceMemberRole.member,
                    projectId: null,
                    projectRole: null,
                    expiryDuration: null,
                },
                null
            );
            expect(
                workspaceInviteService.assertInviteeNotMember
            ).not.toHaveBeenCalled();
            expect(workspaceInviteService.createInvite).toHaveBeenCalledWith(
                'workspace-1',
                'user-1',
                {
                    email: 'invitee@example.com',
                    workspaceRole: EnumWorkspaceMemberRole.member,
                    projectId: null,
                    projectRole: null,
                    expiryDuration: null,
                }
            );
            expect(activityLogService.prepare).toHaveBeenCalledTimes(1);
            expect(activityLogService.prepare).toHaveBeenCalledWith({
                action: EnumActivityLogAction.workspaceInviteCreated,
                userId: 'user-1',
                createdBy: 'user-1',
                workspaceId: 'workspace-1',
                metadata: { workspaceInviteId: 'invite-1' },
            });
            expect(activityLogService.stagePrepared).toHaveBeenCalledWith([
                stagedActivityLog,
            ]);
            expect(notificationService.getRecipient).not.toHaveBeenCalled();
            expect(
                workspaceUtil.mapInviteNotificationPayload
            ).toHaveBeenCalledWith(workspace, invite, 'Jane Doe');
            expect(
                notificationEmailQueue.sendWorkspaceInviteUnregistered
            ).toHaveBeenCalledWith('invitee@example.com', {
                ...payload,
                inviteAcceptLink: tokenData.signUpLink,
            });
            expect(
                notificationQueue.sendWorkspaceInvite
            ).not.toHaveBeenCalled();
        });

        it('stages two rows and notifies the in-app recipient when the existing user differs from the actor', async () => {
            userService.getOneActiveByEmail.mockResolvedValue(existingUser);

            await useCase.execute(workspace, 'user-1', body);

            expect(notificationService.getRecipient).toHaveBeenCalledWith(
                existingUser,
                EnumNotificationKind.workspaceInvite
            );
            expect(activityLogService.prepare).toHaveBeenNthCalledWith(1, {
                action: EnumActivityLogAction.workspaceInviteCreated,
                userId: 'user-1',
                createdBy: 'user-1',
                workspaceId: 'workspace-1',
                metadata: {
                    workspaceInviteId: 'invite-1',
                    targetUserId: 'user-2',
                },
            });
            expect(activityLogService.prepare).toHaveBeenNthCalledWith(2, {
                action: EnumActivityLogAction.workspaceInviteCreatedByAdmin,
                userId: 'user-2',
                createdBy: 'user-1',
                workspaceId: 'workspace-1',
                metadata: { actorUserId: 'user-1' },
            });
            expect(activityLogService.stagePrepared).toHaveBeenCalledWith([
                stagedActivityLog,
                stagedActivityLog,
            ]);
            expect(notificationQueue.sendWorkspaceInvite).toHaveBeenCalledWith(
                recipient,
                { ...payload, inviteAcceptLink: tokenData.claimLink },
                'user-1'
            );
            expect(
                notificationEmailQueue.sendWorkspaceInviteUnregistered
            ).not.toHaveBeenCalled();
        });

        it('stages a single row when the existing user is the actor', async () => {
            userService.getOneActiveByEmail.mockResolvedValue(existingUser);

            await useCase.execute(workspace, 'user-2', body);

            expect(activityLogService.prepare).toHaveBeenCalledTimes(1);
            expect(activityLogService.prepare).toHaveBeenCalledWith({
                action: EnumActivityLogAction.workspaceInviteCreated,
                userId: 'user-2',
                createdBy: 'user-2',
                workspaceId: 'workspace-1',
                metadata: {
                    workspaceInviteId: 'invite-1',
                    targetUserId: 'user-2',
                },
            });
        });

        it('looks up the active project and forwards the project fields and expiry when given', async () => {
            projectService.getActiveByIdAndWorkspace.mockResolvedValue(project);

            await useCase.execute(workspace, 'user-1', {
                ...body,
                projectId: 'project-1',
                projectRole: EnumProjectMemberRole.member,
                expiryDuration: 14,
            } as WorkspaceInviteCreateRequestDto);

            expect(
                projectService.getActiveByIdAndWorkspace
            ).toHaveBeenCalledWith('project-1', 'workspace-1');
            expect(workspaceInviteService.assertCreatable).toHaveBeenCalledWith(
                expect.objectContaining({
                    projectId: 'project-1',
                    projectRole: EnumProjectMemberRole.member,
                    expiryDuration: 14,
                }),
                project
            );
            expect(workspaceInviteService.createInvite).toHaveBeenCalledWith(
                'workspace-1',
                'user-1',
                expect.objectContaining({ expiryDuration: 14 })
            );
        });

        it('reads the project and the invitee together after the pairing gate', async () => {
            const deferredProject = buildDeferred<Project | null>();
            projectService.getActiveByIdAndWorkspace.mockReturnValue(
                deferredProject.promise
            );
            userService.getOneActiveByEmail.mockImplementation(async () => {
                deferredProject.resolve(project);

                return null;
            });

            await useCase.execute(workspace, 'user-1', {
                ...body,
                projectId: 'project-1',
                projectRole: EnumProjectMemberRole.member,
            } as WorkspaceInviteCreateRequestDto);

            expect(workspaceInviteService.assertCreatable).toHaveBeenCalledWith(
                expect.objectContaining({ projectId: 'project-1' }),
                project
            );
        });

        it('runs no query when the project pairing gate rejects', async () => {
            workspaceInviteService.assertProjectRolePaired.mockRejectedValue(
                new WorkspaceInviteRoleRequiredException()
            );

            await expect(
                useCase.execute(workspace, 'user-1', body)
            ).rejects.toBeInstanceOf(WorkspaceInviteRoleRequiredException);
            expect(
                projectService.getActiveByIdAndWorkspace
            ).not.toHaveBeenCalled();
            expect(userService.getOneActiveByEmail).not.toHaveBeenCalled();
        });

        it('writes nothing when the creation check rejects', async () => {
            workspaceInviteService.assertCreatable.mockImplementation(() => {
                throw new WorkspaceInviteProjectMismatchException();
            });

            await expect(
                useCase.execute(workspace, 'user-1', body)
            ).rejects.toBeInstanceOf(WorkspaceInviteProjectMismatchException);
            expect(workspaceInviteService.createInvite).not.toHaveBeenCalled();
            expect(activityLogService.stagePrepared).not.toHaveBeenCalled();
        });

        it('checks the existing user is not a member before the write', async () => {
            userService.getOneActiveByEmail.mockResolvedValue(existingUser);

            await useCase.execute(workspace, 'user-1', body);

            expect(
                workspaceInviteService.assertInviteeNotMember
            ).toHaveBeenCalledWith('workspace-1', 'user-2');
            expect(
                workspaceInviteService.assertInviteeNotMember
            ).toHaveBeenCalledBefore(workspaceInviteService.createInvite);
        });

        it('throws WorkspaceMemberAlreadyExistsException and writes nothing when the invitee is already a member', async () => {
            userService.getOneActiveByEmail.mockResolvedValue(existingUser);
            workspaceInviteService.assertInviteeNotMember.mockRejectedValue(
                new WorkspaceMemberAlreadyExistsException()
            );

            await expect(
                useCase.execute(workspace, 'user-1', body)
            ).rejects.toBeInstanceOf(WorkspaceMemberAlreadyExistsException);
            expect(workspaceInviteService.createInvite).not.toHaveBeenCalled();
            expect(activityLogService.stagePrepared).not.toHaveBeenCalled();
            expect(
                notificationEmailQueue.sendWorkspaceInviteUnregistered
            ).not.toHaveBeenCalled();
        });

        it('emails the token data the domain stored', async () => {
            const storedTokenData: IWorkspaceInviteTokenData = {
                ...tokenData,
                signUpLink: 'https://app.example.com/sign-up/retried-token',
            };
            workspaceInviteService.createInvite.mockResolvedValue({
                invite,
                tokenData: storedTokenData,
            });

            await useCase.execute(workspace, 'user-1', body);

            expect(
                notificationEmailQueue.sendWorkspaceInviteUnregistered
            ).toHaveBeenCalledWith('invitee@example.com', {
                ...payload,
                inviteAcceptLink: storedTokenData.signUpLink,
            });
        });

        it('creates nothing and stages nothing when the inviter name read rejects', async () => {
            const failure = new Error('read-failed');
            userService.getNameById.mockRejectedValue(failure);

            await expect(
                useCase.execute(workspace, 'user-1', body)
            ).rejects.toBe(failure);
            expect(workspaceInviteService.createInvite).not.toHaveBeenCalled();
            expect(activityLogService.stagePrepared).not.toHaveBeenCalled();
        });

        it('creates nothing and stages nothing when the invitee recipient read rejects', async () => {
            const failure = new Error('read-failed');
            userService.getOneActiveByEmail.mockResolvedValue(existingUser);
            notificationService.getRecipient.mockRejectedValue(failure);

            await expect(
                useCase.execute(workspace, 'user-1', body)
            ).rejects.toBe(failure);
            expect(workspaceInviteService.createInvite).not.toHaveBeenCalled();
            expect(activityLogService.stagePrepared).not.toHaveBeenCalled();
        });

        it('stages nothing and notifies nobody when the write rejects', async () => {
            workspaceInviteService.createInvite.mockRejectedValue(
                new WorkspaceInviteDuplicateException()
            );

            await expect(
                useCase.execute(workspace, 'user-1', body)
            ).rejects.toBeInstanceOf(WorkspaceInviteDuplicateException);
            expect(activityLogService.stagePrepared).not.toHaveBeenCalled();
            expect(
                notificationEmailQueue.sendWorkspaceInviteUnregistered
            ).not.toHaveBeenCalled();
        });
    });
});
