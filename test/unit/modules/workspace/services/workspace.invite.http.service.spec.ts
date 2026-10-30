import { Test } from '@nestjs/testing';
import type { TestingModule } from '@nestjs/testing';
import { mock } from 'vitest-mock-extended';
import type { MockProxy } from 'vitest-mock-extended';
import { PaginationStoreKey } from '@common/pagination/constants/pagination.constant';
import { EnumPaginationType } from '@common/pagination/enums/pagination.enum';
import type { IDatabaseTransactionClient } from '@common/database/interfaces/database.client.interface';
import { DatabaseService } from '@common/database/services/database.service';
import { HelperDateService } from '@common/helper/services/helper.date.service';
import type { IPaginationQueryCursorParams } from '@common/pagination/interfaces/pagination.interface';
import { PaginationQueryUtil } from '@common/pagination/utils/pagination.query.util';
import { RequestStoreService } from '@common/request/services/request.store.service';
import type { IResponsePaginationReturn } from '@common/response/interfaces/response.interface';
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
    Prisma,
} from '@generated/prisma-client/client';
import type {
    DeviceOwnership,
    Project,
    User,
    Workspace,
    WorkspaceInvite,
    WorkspaceMember,
} from '@generated/prisma-client/client';
import { ActivityLogDomain } from '@modules/activity-log/domains/activity-log.domain';
import type { IActivityLogStaged } from '@modules/activity-log/interfaces/activity-log.interface';
import { FeatureFlagDomain } from '@modules/feature-flag/domains/feature-flag.domain';
import { FeatureFlagDisabledException } from '@modules/feature-flag/exceptions/feature-flag.disabled.exception';
import { DeviceDomain } from '@modules/device/domains/device.domain';
import { NotificationDomain } from '@modules/notification/domains/notification.domain';
import { EnumNotificationKind } from '@modules/notification/enums/notification.enum';
import type {
    INotificationRecipient,
    INotificationWorkspaceInvitePushPayload,
} from '@modules/notification/interfaces/notification.interface';
import { NotificationEmailQueue } from '@modules/notification/queues/notification.email.queue';
import { NotificationQueue } from '@modules/notification/queues/notification.queue';
import { NotificationUtil } from '@modules/notification/utils/notification.util';
import { ProjectDomain } from '@modules/project/domains/project.domain';
import { ProjectMemberDomain } from '@modules/project/domains/project.member.domain';
import { UserDomain } from '@modules/user/domains/user.domain';
import {
    WorkspaceInviteDefaultAvailableOrderBy,
    WorkspaceInviteDefaultAvailableSearch,
    WorkspaceInviteDefaultStatus,
} from '@modules/workspace/constants/workspace.list.constant';
import type { WorkspaceInviteClaimRequestDto } from '@modules/workspace/dtos/request/workspace.invite-claim.request.dto';
import type { WorkspaceInviteCreateRequestDto } from '@modules/workspace/dtos/request/workspace.invite-create.request.dto';
import type { WorkspaceInviteListRequestDto } from '@modules/workspace/dtos/request/workspace.invite-list.request.dto';
import type { WorkspaceInviteResendRequestDto } from '@modules/workspace/dtos/request/workspace.invite-resend.request.dto';
import { WorkspaceInviteDomain } from '@modules/workspace/domains/workspace.invite.domain';
import { WorkspaceMemberDomain } from '@modules/workspace/domains/workspace.member.domain';
import { WorkspaceInviteAlreadyProcessedException } from '@modules/workspace/exceptions/workspace.invite-already-processed.exception';
import { WorkspaceInviteDuplicateException } from '@modules/workspace/exceptions/workspace.invite-duplicate.exception';
import { WorkspaceInviteRoleRequiredException } from '@modules/workspace/exceptions/workspace.invite-role-required.exception';
import { WorkspaceInviteInvalidException } from '@modules/workspace/exceptions/workspace.invite-invalid.exception';
import { WorkspaceInviteNotFoundException } from '@modules/workspace/exceptions/workspace.invite-not-found.exception';
import type {
    IWorkspaceInviteList,
    IWorkspaceInviteTokenData,
} from '@modules/workspace/interfaces/workspace.interface';
import { WorkspaceInviteHttpService } from '@modules/workspace/services/workspace.invite.http.service';
import { WorkspaceUtil } from '@modules/workspace/utils/workspace.util';
import { TestRecipient } from '@test/unit/helpers/test.unit.notification-push.helper';

describe('WorkspaceInviteHttpService', () => {
    const workspaceInviteDomain: MockProxy<WorkspaceInviteDomain> =
        mock<WorkspaceInviteDomain>();
    const workspaceMemberDomain: MockProxy<WorkspaceMemberDomain> =
        mock<WorkspaceMemberDomain>();
    const projectMemberDomain: MockProxy<ProjectMemberDomain> =
        mock<ProjectMemberDomain>();
    const projectDomain: MockProxy<ProjectDomain> = mock<ProjectDomain>();
    const userDomain: MockProxy<UserDomain> = mock<UserDomain>();
    const deviceDomain: MockProxy<DeviceDomain> = mock<DeviceDomain>();
    const notificationDomain: MockProxy<NotificationDomain> =
        mock<NotificationDomain>();
    const notificationUtil: MockProxy<NotificationUtil> =
        mock<NotificationUtil>();
    const databaseService: MockProxy<DatabaseService> = mock<DatabaseService>();
    const helperDateService: MockProxy<HelperDateService> =
        mock<HelperDateService>();
    const featureFlagDomain: MockProxy<FeatureFlagDomain> =
        mock<FeatureFlagDomain>();
    const activityLogDomain: MockProxy<ActivityLogDomain> =
        mock<ActivityLogDomain>();
    const notificationQueue: MockProxy<NotificationQueue> =
        mock<NotificationQueue>();
    const notificationEmailQueue: MockProxy<NotificationEmailQueue> =
        mock<NotificationEmailQueue>();
    const workspaceUtil: MockProxy<WorkspaceUtil> = mock<WorkspaceUtil>();
    const paginationQueryUtil: MockProxy<PaginationQueryUtil> =
        mock<PaginationQueryUtil>();
    const requestStoreService: MockProxy<RequestStoreService> =
        mock<RequestStoreService>();

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

    const ownership: DeviceOwnership = {
        id: 'ownership-1',
        deviceId: 'device-1',
        userId: 'user-2',
        revokedAt: null,
        isRevoked: false,
        revokedById: null,
        lastActiveAt: new Date('2026-01-01T00:00:00.000Z'),
        notificationToken: 'token-1',
        notificationProvider: null,
        biometricEnabled: false,
        biometricToken: null,
        biometricType: null,
        biometricEnabledAt: null,
        createdAt: new Date('2026-01-01T00:00:00.000Z'),
        createdBy: null,
        updatedAt: new Date('2026-01-01T00:00:00.000Z'),
        updatedBy: null,
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

    const cursorPagination: IPaginationQueryCursorParams<Prisma.WorkspaceInviteWhereInput> =
        { limit: 20, orderBy: [] };

    let service: WorkspaceInviteHttpService;

    beforeEach(async () => {
        vi.resetAllMocks();
        activityLogDomain.prepare.mockReturnValue(stagedActivityLog);
        helperDateService.create.mockReturnValue(now);
        databaseService.withTransaction.mockImplementation(async fn => fn(tx));
        deviceDomain.getOwnershipsWithNotificationToken.mockResolvedValue([
            ownership,
        ]);
        notificationDomain.getListUserSetting.mockResolvedValue([]);
        paginationQueryUtil.cursor.mockReturnValue({
            params: cursorPagination,
            storePatch: {},
        });

        const module: TestingModule = await Test.createTestingModule({
            providers: [
                WorkspaceInviteHttpService,
                {
                    provide: WorkspaceInviteDomain,
                    useValue: workspaceInviteDomain,
                },
                {
                    provide: WorkspaceMemberDomain,
                    useValue: workspaceMemberDomain,
                },
                { provide: ProjectMemberDomain, useValue: projectMemberDomain },
                { provide: ProjectDomain, useValue: projectDomain },
                { provide: UserDomain, useValue: userDomain },
                { provide: DeviceDomain, useValue: deviceDomain },
                { provide: NotificationDomain, useValue: notificationDomain },
                { provide: NotificationUtil, useValue: notificationUtil },
                { provide: DatabaseService, useValue: databaseService },
                { provide: HelperDateService, useValue: helperDateService },
                { provide: FeatureFlagDomain, useValue: featureFlagDomain },
                { provide: ActivityLogDomain, useValue: activityLogDomain },
                { provide: NotificationQueue, useValue: notificationQueue },
                {
                    provide: NotificationEmailQueue,
                    useValue: notificationEmailQueue,
                },
                { provide: WorkspaceUtil, useValue: workspaceUtil },
                {
                    provide: PaginationQueryUtil,
                    useValue: paginationQueryUtil,
                },
                { provide: RequestStoreService, useValue: requestStoreService },
            ],
        }).compile();

        service = module.get(WorkspaceInviteHttpService);
    });

    describe('getInvitesList', () => {
        it('gates on the invitation flag before listing', async () => {
            featureFlagDomain.validateFeatureFlagMetadata.mockRejectedValue(
                new FeatureFlagDisabledException()
            );

            await expect(
                service.getInvitesList('workspace-1', {})
            ).rejects.toBeInstanceOf(FeatureFlagDisabledException);
            expect(workspaceInviteDomain.getInvitesList).not.toHaveBeenCalled();
        });

        it('parses the cursor query, merges the status filter, and returns the page', async () => {
            const query: WorkspaceInviteListRequestDto = {
                status: 'pending',
            };
            const statusFilter = {
                where: { status: { in: [EnumWorkspaceInviteStatus.pending] } },
                storeFilter: { status: [EnumWorkspaceInviteStatus.pending] },
            };
            paginationQueryUtil.inEnum.mockReturnValue(statusFilter);
            const page: IResponsePaginationReturn<IWorkspaceInviteList> = {
                type: EnumPaginationType.cursor,
                perPage: 20,
                hasNext: false,
                data: [],
            };
            workspaceInviteDomain.getInvitesList.mockResolvedValue(page);

            await service.getInvitesList('workspace-1', query);

            expect(paginationQueryUtil.cursor).toHaveBeenCalledWith(query, {
                availableSearch: WorkspaceInviteDefaultAvailableSearch,
                availableOrderBy: WorkspaceInviteDefaultAvailableOrderBy,
            });
            expect(paginationQueryUtil.inEnum).toHaveBeenCalledWith(
                Prisma.WorkspaceInviteScalarFieldEnum.status,
                'pending',
                WorkspaceInviteDefaultStatus
            );
            expect(requestStoreService.merge).toHaveBeenCalledWith(
                PaginationStoreKey,
                { filters: { status: [EnumWorkspaceInviteStatus.pending] } }
            );
            expect(workspaceInviteDomain.getInvitesList).toHaveBeenCalledWith(
                'workspace-1',
                cursorPagination,
                statusFilter.where
            );
        });

        it('merges an empty filter set when status is absent', async () => {
            paginationQueryUtil.inEnum.mockReturnValue(null);
            const page: IResponsePaginationReturn<IWorkspaceInviteList> = {
                type: EnumPaginationType.cursor,
                perPage: 20,
                hasNext: false,
                data: [],
            };
            workspaceInviteDomain.getInvitesList.mockResolvedValue(page);

            await service.getInvitesList('workspace-1', {});

            expect(requestStoreService.merge).toHaveBeenCalledWith(
                PaginationStoreKey,
                { filters: {} }
            );
        });
    });

    describe('createInvite', () => {
        const body: WorkspaceInviteCreateRequestDto = {
            email: 'invitee@example.com' as Lowercase<string>,
            workspaceRole: EnumWorkspaceMemberRole.member,
        };

        beforeEach(() => {
            userDomain.getOneActiveByEmail.mockResolvedValue(null);
            workspaceInviteDomain.existsPendingByEmail.mockResolvedValue(false);
            userDomain.getNameById.mockResolvedValue({
                name: 'Jane Doe',
                username: 'jane',
            });
            workspaceUtil.resolveInviterName.mockReturnValue('Jane Doe');
            workspaceUtil.createInviteTokenData.mockReturnValue(tokenData);
            workspaceUtil.mapInviteNotificationPayload.mockReturnValue(payload);
            workspaceInviteDomain.createInvite.mockResolvedValue(invite);
            notificationUtil.mapRecipient.mockReturnValue(recipient);
        });

        it('gates, checks, reads the inviter and invitee, writes, stages, and emails an unregistered invitee in order', async () => {
            const callOrder: string[] = [];
            featureFlagDomain.validateFeatureFlagMetadata.mockImplementation(
                async () => {
                    callOrder.push('gate');
                }
            );
            userDomain.getOneActiveByEmail.mockImplementation(async () => {
                callOrder.push('lookup');

                return null;
            });
            workspaceInviteDomain.assertProjectRolePaired.mockImplementation(
                () => {
                    callOrder.push('paired');
                }
            );
            workspaceInviteDomain.assertCreatable.mockImplementation(() => {
                callOrder.push('assertCreatable');
            });
            userDomain.getNameById.mockImplementation(async () => {
                callOrder.push('inviterName');

                return { name: 'Jane Doe', username: 'jane' };
            });
            workspaceInviteDomain.createInvite.mockImplementation(async () => {
                callOrder.push('create');

                return invite;
            });
            activityLogDomain.stagePrepared.mockImplementation(() => {
                callOrder.push('stage');
            });
            notificationEmailQueue.sendWorkspaceInviteUnregistered.mockImplementation(
                async () => {
                    callOrder.push('email');
                }
            );

            const result = await service.createInvite(
                workspace,
                'user-1',
                body
            );

            expect(result).toEqual({ data: invite });
            expect(callOrder[0]).toBe('gate');
            expect(callOrder[1]).toBe('paired');
            expect(callOrder.indexOf('assertCreatable')).toBeGreaterThan(
                callOrder.indexOf('lookup')
            );
            expect(callOrder.indexOf('inviterName')).toBeGreaterThan(
                callOrder.indexOf('assertCreatable')
            );
            expect(callOrder.slice(-3)).toEqual(['create', 'stage', 'email']);
            expect(
                featureFlagDomain.validateFeatureFlagMetadata
            ).toHaveBeenCalledWith('workspace', 'invitationAllowed');
            expect(
                projectDomain.getActiveByIdAndWorkspace
            ).not.toHaveBeenCalled();
            expect(userDomain.getOneActiveByEmail).toHaveBeenCalledWith(
                'invitee@example.com'
            );
            expect(
                workspaceInviteDomain.existsPendingByEmail
            ).toHaveBeenCalledWith('workspace-1', 'invitee@example.com');
            expect(workspaceInviteDomain.assertCreatable).toHaveBeenCalledWith(
                {
                    email: 'invitee@example.com',
                    workspaceRole: EnumWorkspaceMemberRole.member,
                    projectId: null,
                    projectRole: null,
                    expiryDuration: null,
                },
                null,
                false
            );
            expect(workspaceUtil.createInviteTokenData).toHaveBeenCalledWith(
                null
            );
            expect(workspaceInviteDomain.createInvite).toHaveBeenCalledWith(
                'workspace-1',
                'user-1',
                {
                    email: 'invitee@example.com',
                    workspaceRole: EnumWorkspaceMemberRole.member,
                    projectId: null,
                    projectRole: null,
                    expiryDuration: null,
                },
                tokenData
            );
            expect(activityLogDomain.prepare).toHaveBeenCalledTimes(1);
            expect(activityLogDomain.prepare).toHaveBeenCalledWith({
                action: EnumActivityLogAction.workspaceInviteCreated,
                userId: 'user-1',
                createdBy: 'user-1',
                workspaceId: 'workspace-1',
                metadata: { workspaceInviteId: 'invite-1' },
            });
            expect(activityLogDomain.stagePrepared).toHaveBeenCalledWith([
                stagedActivityLog,
            ]);
            expect(notificationUtil.mapRecipient).not.toHaveBeenCalled();
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
            userDomain.getOneActiveByEmail.mockResolvedValue(existingUser);

            await service.createInvite(workspace, 'user-1', body);

            expect(
                deviceDomain.getOwnershipsWithNotificationToken
            ).toHaveBeenCalledWith('user-2');
            expect(notificationDomain.getListUserSetting).toHaveBeenCalledWith(
                'user-2'
            );
            expect(notificationUtil.mapRecipient).toHaveBeenCalledWith(
                existingUser,
                EnumNotificationKind.workspaceInvite,
                ['token-1'],
                []
            );
            expect(activityLogDomain.prepare).toHaveBeenNthCalledWith(1, {
                action: EnumActivityLogAction.workspaceInviteCreated,
                userId: 'user-1',
                createdBy: 'user-1',
                workspaceId: 'workspace-1',
                metadata: {
                    workspaceInviteId: 'invite-1',
                    targetUserId: 'user-2',
                },
            });
            expect(activityLogDomain.prepare).toHaveBeenNthCalledWith(2, {
                action: EnumActivityLogAction.workspaceInviteCreatedByAdmin,
                userId: 'user-2',
                createdBy: 'user-1',
                workspaceId: 'workspace-1',
                metadata: { actorUserId: 'user-1' },
            });
            expect(activityLogDomain.stagePrepared).toHaveBeenCalledWith([
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
            userDomain.getOneActiveByEmail.mockResolvedValue(existingUser);

            await service.createInvite(workspace, 'user-2', body);

            expect(activityLogDomain.prepare).toHaveBeenCalledTimes(1);
            expect(activityLogDomain.prepare).toHaveBeenCalledWith({
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
            projectDomain.getActiveByIdAndWorkspace.mockResolvedValue(project);

            await service.createInvite(workspace, 'user-1', {
                ...body,
                projectId: 'project-1',
                projectRole: EnumProjectMemberRole.member,
                expiryDuration: 14,
            } as WorkspaceInviteCreateRequestDto);

            expect(
                projectDomain.getActiveByIdAndWorkspace
            ).toHaveBeenCalledWith('project-1', 'workspace-1');
            expect(workspaceInviteDomain.assertCreatable).toHaveBeenCalledWith(
                expect.objectContaining({
                    projectId: 'project-1',
                    projectRole: EnumProjectMemberRole.member,
                    expiryDuration: 14,
                }),
                project,
                false
            );
            expect(workspaceUtil.createInviteTokenData).toHaveBeenCalledWith(
                14
            );
        });

        it('reads nothing when the gate rejects', async () => {
            featureFlagDomain.validateFeatureFlagMetadata.mockRejectedValue(
                new FeatureFlagDisabledException()
            );

            await expect(
                service.createInvite(workspace, 'user-1', body)
            ).rejects.toBeInstanceOf(FeatureFlagDisabledException);
            expect(userDomain.getOneActiveByEmail).not.toHaveBeenCalled();
            expect(workspaceInviteDomain.createInvite).not.toHaveBeenCalled();
        });

        it('reads the project, the duplicate, and the invitee together after the pairing gate', async () => {
            const deferredProject = Promise.withResolvers<Project | null>();
            projectDomain.getActiveByIdAndWorkspace.mockReturnValue(
                deferredProject.promise
            );
            userDomain.getOneActiveByEmail.mockImplementation(async () => {
                deferredProject.resolve(project);

                return null;
            });

            await service.createInvite(workspace, 'user-1', {
                ...body,
                projectId: 'project-1',
                projectRole: EnumProjectMemberRole.member,
            } as WorkspaceInviteCreateRequestDto);

            expect(
                workspaceInviteDomain.existsPendingByEmail
            ).toHaveBeenCalledWith('workspace-1', 'invitee@example.com');
        });

        it('runs no query when the project pairing gate rejects', async () => {
            workspaceInviteDomain.assertProjectRolePaired.mockImplementation(
                () => {
                    throw new WorkspaceInviteRoleRequiredException();
                }
            );

            await expect(
                service.createInvite(workspace, 'user-1', body)
            ).rejects.toBeInstanceOf(WorkspaceInviteRoleRequiredException);
            expect(
                projectDomain.getActiveByIdAndWorkspace
            ).not.toHaveBeenCalled();
            expect(
                workspaceInviteDomain.existsPendingByEmail
            ).not.toHaveBeenCalled();
            expect(userDomain.getOneActiveByEmail).not.toHaveBeenCalled();
        });

        it('draws no token and writes nothing when the creation check rejects', async () => {
            workspaceInviteDomain.assertCreatable.mockImplementation(() => {
                throw new WorkspaceInviteDuplicateException();
            });

            await expect(
                service.createInvite(workspace, 'user-1', body)
            ).rejects.toBeInstanceOf(WorkspaceInviteDuplicateException);
            expect(workspaceUtil.createInviteTokenData).not.toHaveBeenCalled();
            expect(workspaceInviteDomain.createInvite).not.toHaveBeenCalled();
            expect(activityLogDomain.stagePrepared).not.toHaveBeenCalled();
        });

        it('creates nothing and stages nothing when the inviter name read rejects', async () => {
            const failure = new Error('read-failed');
            userDomain.getNameById.mockRejectedValue(failure);

            await expect(
                service.createInvite(workspace, 'user-1', body)
            ).rejects.toBe(failure);
            expect(workspaceInviteDomain.createInvite).not.toHaveBeenCalled();
            expect(activityLogDomain.stagePrepared).not.toHaveBeenCalled();
        });

        it('creates nothing and stages nothing when the invitee recipient read rejects', async () => {
            const failure = new Error('read-failed');
            userDomain.getOneActiveByEmail.mockResolvedValue(existingUser);
            deviceDomain.getOwnershipsWithNotificationToken.mockRejectedValue(
                failure
            );

            await expect(
                service.createInvite(workspace, 'user-1', body)
            ).rejects.toBe(failure);
            expect(workspaceInviteDomain.createInvite).not.toHaveBeenCalled();
            expect(activityLogDomain.stagePrepared).not.toHaveBeenCalled();
        });

        it('stages nothing and notifies nobody when the write rejects', async () => {
            workspaceInviteDomain.createInvite.mockRejectedValue(
                new WorkspaceInviteDuplicateException()
            );

            await expect(
                service.createInvite(workspace, 'user-1', body)
            ).rejects.toBeInstanceOf(WorkspaceInviteDuplicateException);
            expect(activityLogDomain.stagePrepared).not.toHaveBeenCalled();
            expect(
                notificationEmailQueue.sendWorkspaceInviteUnregistered
            ).not.toHaveBeenCalled();
        });
    });

    describe('resendInvite', () => {
        const body: WorkspaceInviteResendRequestDto = {};

        beforeEach(() => {
            workspaceInviteDomain.getPendingById.mockResolvedValue(invite);
            userDomain.getOneActiveByEmail.mockResolvedValue(null);
            userDomain.getNameById.mockResolvedValue(null);
            workspaceUtil.resolveInviterName.mockReturnValue('Acme');
            workspaceUtil.createInviteTokenData.mockReturnValue(tokenData);
            workspaceUtil.mapInviteNotificationPayload.mockReturnValue(payload);
            workspaceInviteDomain.resendInvite.mockResolvedValue(invite);
            notificationUtil.mapRecipient.mockReturnValue(recipient);
        });

        it('gates, reads the pending invite, prepares the row, rotates, stages, and emails an unregistered invitee in order', async () => {
            const callOrder: string[] = [];
            featureFlagDomain.validateFeatureFlagMetadata.mockImplementation(
                async () => {
                    callOrder.push('gate');
                }
            );
            workspaceInviteDomain.getPendingById.mockImplementation(
                async () => {
                    callOrder.push('pending');

                    return invite;
                }
            );
            activityLogDomain.prepare.mockImplementation(() => {
                callOrder.push('prepare');

                return stagedActivityLog;
            });
            workspaceInviteDomain.resendInvite.mockImplementation(async () => {
                callOrder.push('rotate');

                return invite;
            });
            activityLogDomain.stagePrepared.mockImplementation(() => {
                callOrder.push('stage');
            });
            notificationEmailQueue.sendWorkspaceInviteUnregistered.mockImplementation(
                async () => {
                    callOrder.push('email');
                }
            );

            const result = await service.resendInvite(
                workspace,
                'user-1',
                'invite-1',
                body
            );

            expect(result).toEqual({ data: invite });
            expect(callOrder).toEqual([
                'gate',
                'pending',
                'prepare',
                'rotate',
                'stage',
                'email',
            ]);
            expect(
                featureFlagDomain.validateFeatureFlagMetadata
            ).toHaveBeenCalledWith('workspace', 'invitationAllowed');
            expect(workspaceInviteDomain.getPendingById).toHaveBeenCalledWith(
                'invite-1',
                'workspace-1'
            );
            expect(userDomain.getOneActiveByEmail).toHaveBeenCalledWith(
                'invitee@example.com'
            );
            expect(workspaceUtil.createInviteTokenData).toHaveBeenCalledWith(
                null
            );
            expect(workspaceInviteDomain.resendInvite).toHaveBeenCalledWith(
                'invite-1',
                tokenData
            );
            expect(activityLogDomain.prepare).toHaveBeenCalledWith({
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

        it('forwards the requested expiry to the token draw', async () => {
            await service.resendInvite(workspace, 'user-1', 'invite-1', {
                expiryDuration: 14,
            } as WorkspaceInviteResendRequestDto);

            expect(workspaceUtil.createInviteTokenData).toHaveBeenCalledWith(
                14
            );
        });

        it('stages the actor row and the invitee row and notifies the in-app recipient when the invitee differs from the actor', async () => {
            userDomain.getOneActiveByEmail.mockResolvedValue(existingUser);

            await service.resendInvite(workspace, 'user-1', 'invite-1', body);

            expect(
                deviceDomain.getOwnershipsWithNotificationToken
            ).toHaveBeenCalledWith('user-2');
            expect(notificationDomain.getListUserSetting).toHaveBeenCalledWith(
                'user-2'
            );
            expect(notificationUtil.mapRecipient).toHaveBeenCalledWith(
                existingUser,
                EnumNotificationKind.workspaceInvite,
                ['token-1'],
                []
            );
            expect(activityLogDomain.prepare).toHaveBeenNthCalledWith(2, {
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
            userDomain.getOneActiveByEmail.mockResolvedValue(existingUser);

            await service.resendInvite(workspace, 'user-2', 'invite-1', body);

            expect(activityLogDomain.prepare).toHaveBeenCalledTimes(1);
        });

        it('reads nothing when the gate rejects', async () => {
            featureFlagDomain.validateFeatureFlagMetadata.mockRejectedValue(
                new FeatureFlagDisabledException()
            );

            await expect(
                service.resendInvite(workspace, 'user-1', 'invite-1', body)
            ).rejects.toBeInstanceOf(FeatureFlagDisabledException);
            expect(workspaceInviteDomain.getPendingById).not.toHaveBeenCalled();
        });

        it('draws no token when the invite is not pending', async () => {
            workspaceInviteDomain.getPendingById.mockRejectedValue(
                new WorkspaceInviteNotFoundException()
            );

            await expect(
                service.resendInvite(workspace, 'user-1', 'invite-1', body)
            ).rejects.toBeInstanceOf(WorkspaceInviteNotFoundException);
            expect(workspaceUtil.createInviteTokenData).not.toHaveBeenCalled();
            expect(workspaceInviteDomain.resendInvite).not.toHaveBeenCalled();
        });

        it('rotates nothing when the invitee recipient read rejects', async () => {
            const failure = new Error('read-failed');
            userDomain.getOneActiveByEmail.mockResolvedValue(existingUser);
            deviceDomain.getOwnershipsWithNotificationToken.mockRejectedValue(
                failure
            );

            await expect(
                service.resendInvite(workspace, 'user-1', 'invite-1', body)
            ).rejects.toBe(failure);
            expect(workspaceInviteDomain.resendInvite).not.toHaveBeenCalled();
        });

        it('rotates nothing when the inviter name read rejects', async () => {
            const failure = new Error('read-failed');
            userDomain.getNameById.mockRejectedValue(failure);

            await expect(
                service.resendInvite(workspace, 'user-1', 'invite-1', body)
            ).rejects.toBe(failure);
            expect(workspaceInviteDomain.resendInvite).not.toHaveBeenCalled();
        });

        it('stages nothing and notifies nobody when the rotation rejects', async () => {
            workspaceInviteDomain.resendInvite.mockRejectedValue(
                new WorkspaceInviteAlreadyProcessedException()
            );

            await expect(
                service.resendInvite(workspace, 'user-1', 'invite-1', body)
            ).rejects.toBeInstanceOf(WorkspaceInviteAlreadyProcessedException);
            expect(activityLogDomain.stagePrepared).not.toHaveBeenCalled();
            expect(
                notificationEmailQueue.sendWorkspaceInviteUnregistered
            ).not.toHaveBeenCalled();
        });
    });

    describe('revokeInvite', () => {
        beforeEach(() => {
            workspaceInviteDomain.getPendingById.mockResolvedValue(invite);
            userDomain.getOneActiveByEmail.mockResolvedValue(null);
        });

        it('gates, reads the pending invite and the invitee, prepares the row, revokes, and stages in order', async () => {
            const callOrder: string[] = [];
            featureFlagDomain.validateFeatureFlagMetadata.mockImplementation(
                async () => {
                    callOrder.push('gate');
                }
            );
            workspaceInviteDomain.getPendingById.mockImplementation(
                async () => {
                    callOrder.push('pending');

                    return invite;
                }
            );
            userDomain.getOneActiveByEmail.mockImplementation(async () => {
                callOrder.push('lookup');

                return null;
            });
            activityLogDomain.prepare.mockImplementation(() => {
                callOrder.push('prepare');

                return stagedActivityLog;
            });
            workspaceInviteDomain.revokeInvite.mockImplementation(async () => {
                callOrder.push('revoke');
            });
            activityLogDomain.stagePrepared.mockImplementation(() => {
                callOrder.push('stage');
            });

            const result = await service.revokeInvite(
                'workspace-1',
                'user-1',
                'invite-1'
            );

            expect(result).toEqual({});
            expect(callOrder).toEqual([
                'gate',
                'pending',
                'lookup',
                'prepare',
                'revoke',
                'stage',
            ]);
            expect(workspaceInviteDomain.getPendingById).toHaveBeenCalledWith(
                'invite-1',
                'workspace-1'
            );
            expect(workspaceInviteDomain.revokeInvite).toHaveBeenCalledWith(
                'invite-1'
            );
            expect(activityLogDomain.prepare).toHaveBeenCalledTimes(1);
            expect(activityLogDomain.prepare).toHaveBeenCalledWith({
                action: EnumActivityLogAction.workspaceInviteRevoked,
                userId: 'user-1',
                createdBy: 'user-1',
                workspaceId: 'workspace-1',
                metadata: { workspaceInviteId: 'invite-1' },
            });
        });

        it('stages two rows when the existing user differs from the actor', async () => {
            userDomain.getOneActiveByEmail.mockResolvedValue(existingUser);

            await service.revokeInvite('workspace-1', 'user-1', 'invite-1');

            expect(activityLogDomain.prepare).toHaveBeenNthCalledWith(1, {
                action: EnumActivityLogAction.workspaceInviteRevoked,
                userId: 'user-1',
                createdBy: 'user-1',
                workspaceId: 'workspace-1',
                metadata: {
                    workspaceInviteId: 'invite-1',
                    targetUserId: 'user-2',
                },
            });
            expect(activityLogDomain.prepare).toHaveBeenNthCalledWith(2, {
                action: EnumActivityLogAction.workspaceInviteRevokedByAdmin,
                userId: 'user-2',
                createdBy: 'user-1',
                workspaceId: 'workspace-1',
                metadata: { actorUserId: 'user-1' },
            });
            expect(activityLogDomain.stagePrepared).toHaveBeenCalledWith([
                stagedActivityLog,
                stagedActivityLog,
            ]);
        });

        it('stages a single row when the existing user is the actor', async () => {
            userDomain.getOneActiveByEmail.mockResolvedValue(existingUser);

            await service.revokeInvite('workspace-1', 'user-2', 'invite-1');

            expect(activityLogDomain.prepare).toHaveBeenCalledTimes(1);
        });

        it('reads nothing when the gate rejects', async () => {
            featureFlagDomain.validateFeatureFlagMetadata.mockRejectedValue(
                new FeatureFlagDisabledException()
            );

            await expect(
                service.revokeInvite('workspace-1', 'user-1', 'invite-1')
            ).rejects.toBeInstanceOf(FeatureFlagDisabledException);
            expect(workspaceInviteDomain.getPendingById).not.toHaveBeenCalled();
        });

        it('looks up no invitee when the invite is not pending', async () => {
            workspaceInviteDomain.getPendingById.mockRejectedValue(
                new WorkspaceInviteAlreadyProcessedException()
            );

            await expect(
                service.revokeInvite('workspace-1', 'user-1', 'invite-1')
            ).rejects.toBeInstanceOf(WorkspaceInviteAlreadyProcessedException);
            expect(userDomain.getOneActiveByEmail).not.toHaveBeenCalled();
        });

        it('stages nothing when the guarded revoke rejects', async () => {
            workspaceInviteDomain.revokeInvite.mockRejectedValue(
                new WorkspaceInviteAlreadyProcessedException()
            );

            await expect(
                service.revokeInvite('workspace-1', 'user-1', 'invite-1')
            ).rejects.toBeInstanceOf(WorkspaceInviteAlreadyProcessedException);
            expect(activityLogDomain.stagePrepared).not.toHaveBeenCalled();
        });
    });

    describe('claimInvite', () => {
        const body: WorkspaceInviteClaimRequestDto = {
            inviteToken: 'raw-token',
        };

        beforeEach(() => {
            workspaceInviteDomain.validateInviteForEmail.mockResolvedValue(
                invite
            );
        });

        it('gates, validates, accepts the invite before the member insert on one transaction, then stages the accepted rows', async () => {
            const callOrder: string[] = [];
            featureFlagDomain.validateFeatureFlagMetadata.mockImplementation(
                async () => {
                    callOrder.push('gate');
                }
            );
            workspaceInviteDomain.validateInviteForEmail.mockImplementation(
                async () => {
                    callOrder.push('validate');

                    return invite;
                }
            );
            workspaceInviteDomain.acceptPendingInTx.mockImplementation(
                async () => {
                    callOrder.push('acceptInvite');
                }
            );
            workspaceMemberDomain.createInTx.mockImplementation(async () => {
                callOrder.push('createMember');

                return existingMember;
            });
            userDomain.setLastWorkspaceInTx.mockImplementation(async () => {
                callOrder.push('setLastWorkspace');
            });
            activityLogDomain.stagePrepared.mockImplementation(() => {
                callOrder.push('stage');
            });

            const result = await service.claimInvite(
                'user-2',
                'invitee@example.com',
                body
            );

            expect(result).toEqual({});
            expect(callOrder).toEqual([
                'gate',
                'validate',
                'acceptInvite',
                'createMember',
                'setLastWorkspace',
                'stage',
            ]);
            expect(
                featureFlagDomain.validateFeatureFlagMetadata
            ).toHaveBeenCalledWith('workspace', 'invitationAllowed');
            expect(
                workspaceInviteDomain.validateInviteForEmail
            ).toHaveBeenCalledWith('raw-token', 'invitee@example.com');
            expect(
                workspaceInviteDomain.assertInviteeNotMember
            ).toHaveBeenCalledWith('workspace-1', 'user-2');
            expect(databaseService.withTransaction).toHaveBeenCalledTimes(1);
            expect(
                workspaceInviteDomain.acceptPendingInTx
            ).toHaveBeenCalledWith(tx, 'invite-1', 'user-2', now);
            expect(workspaceMemberDomain.createInTx).toHaveBeenCalledWith(
                tx,
                'workspace-1',
                'user-2',
                EnumWorkspaceMemberRole.member,
                'user-2'
            );
            expect(userDomain.setLastWorkspaceInTx).toHaveBeenCalledWith(
                tx,
                'user-2',
                'workspace-1'
            );
            expect(projectMemberDomain.createInTx).not.toHaveBeenCalled();
            expect(activityLogDomain.prepare).toHaveBeenNthCalledWith(1, {
                action: EnumActivityLogAction.workspaceInviteAccepted,
                userId: 'user-2',
                createdBy: 'user-2',
                workspaceId: 'workspace-1',
                metadata: { targetUserId: 'user-1' },
            });
            expect(activityLogDomain.prepare).toHaveBeenNthCalledWith(2, {
                action: EnumActivityLogAction.workspaceInviteAcceptedByInvitee,
                userId: 'user-1',
                createdBy: 'user-2',
                workspaceId: 'workspace-1',
                metadata: { actorUserId: 'user-2' },
            });
            expect(activityLogDomain.stagePrepared).toHaveBeenCalledWith([
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
            workspaceInviteDomain.validateInviteForEmail.mockResolvedValue(
                projectInvite
            );
            const callOrder: string[] = [];
            userDomain.setLastWorkspaceInTx.mockImplementation(async () => {
                callOrder.push('setLastWorkspace');
            });
            projectMemberDomain.createInTx.mockImplementation(async () => {
                callOrder.push('createProjectMember');

                return mock();
            });

            await service.claimInvite('user-2', 'invitee@example.com', body);

            expect(callOrder).toEqual([
                'setLastWorkspace',
                'createProjectMember',
            ]);
            expect(projectMemberDomain.createInTx).toHaveBeenCalledWith(
                tx,
                'project-1',
                'user-2',
                EnumProjectMemberRole.member,
                'user-2'
            );
        });

        it('stages a single row when the caller invited itself', async () => {
            workspaceInviteDomain.validateInviteForEmail.mockResolvedValue({
                ...invite,
                invitedByUserId: 'user-2',
            });

            await service.claimInvite('user-2', 'invitee@example.com', body);

            expect(activityLogDomain.prepare).toHaveBeenCalledTimes(1);
            expect(activityLogDomain.stagePrepared).toHaveBeenCalledWith([
                stagedActivityLog,
            ]);
        });

        it('validates nothing when the gate rejects', async () => {
            featureFlagDomain.validateFeatureFlagMetadata.mockRejectedValue(
                new FeatureFlagDisabledException()
            );

            await expect(
                service.claimInvite('user-2', 'invitee@example.com', body)
            ).rejects.toBeInstanceOf(FeatureFlagDisabledException);
            expect(
                workspaceInviteDomain.validateInviteForEmail
            ).not.toHaveBeenCalled();
            expect(databaseService.withTransaction).not.toHaveBeenCalled();
        });

        it('throws WorkspaceInviteInvalidException before the membership read when the token does not resolve', async () => {
            workspaceInviteDomain.validateInviteForEmail.mockRejectedValue(
                new WorkspaceInviteInvalidException()
            );

            await expect(
                service.claimInvite('user-2', 'invitee@example.com', body)
            ).rejects.toBeInstanceOf(WorkspaceInviteInvalidException);
            expect(
                workspaceInviteDomain.assertInviteeNotMember
            ).not.toHaveBeenCalled();
            expect(databaseService.withTransaction).not.toHaveBeenCalled();
            expect(activityLogDomain.stagePrepared).not.toHaveBeenCalled();
        });

        it('throws WorkspaceInviteInvalidException when the caller is already a member', async () => {
            workspaceInviteDomain.assertInviteeNotMember.mockRejectedValue(
                new WorkspaceInviteInvalidException()
            );

            await expect(
                service.claimInvite('user-2', 'invitee@example.com', body)
            ).rejects.toBeInstanceOf(WorkspaceInviteInvalidException);
            expect(databaseService.withTransaction).not.toHaveBeenCalled();
            expect(activityLogDomain.stagePrepared).not.toHaveBeenCalled();
        });

        it('propagates WorkspaceInviteAlreadyProcessedException from the guarded accept, writes nothing after it, and stages nothing', async () => {
            workspaceInviteDomain.acceptPendingInTx.mockRejectedValue(
                new WorkspaceInviteAlreadyProcessedException()
            );

            await expect(
                service.claimInvite('user-2', 'invitee@example.com', body)
            ).rejects.toBeInstanceOf(WorkspaceInviteAlreadyProcessedException);
            expect(workspaceMemberDomain.createInTx).not.toHaveBeenCalled();
            expect(userDomain.setLastWorkspaceInTx).not.toHaveBeenCalled();
            expect(projectMemberDomain.createInTx).not.toHaveBeenCalled();
            expect(activityLogDomain.stagePrepared).not.toHaveBeenCalled();
        });
    });

    describe('previewInvite', () => {
        it('gates, validates the token, reads the workspace and inviter together, and maps the preview', async () => {
            const inviter = { name: 'Jane Doe', username: 'jane' };
            const preview = {
                workspaceName: 'Acme',
                inviterName: 'Jane Doe',
                workspaceRole: EnumWorkspaceMemberRole.member,
                expiredAt: invite.expiredAt,
            };
            const callOrder: string[] = [];
            featureFlagDomain.validateFeatureFlagMetadata.mockImplementation(
                async () => {
                    callOrder.push('gate');
                }
            );
            workspaceInviteDomain.validateInviteToken.mockImplementation(
                async () => {
                    callOrder.push('validate');

                    return invite;
                }
            );
            workspaceInviteDomain.getWorkspaceOfInvite.mockResolvedValue(
                workspace
            );
            userDomain.getNameById.mockResolvedValue(inviter);
            workspaceUtil.mapInvitePreview.mockReturnValue(preview);

            const result = await service.previewInvite({
                inviteToken: 'raw-token',
            });

            expect(result).toEqual({ data: preview });
            expect(callOrder).toEqual(['gate', 'validate']);
            expect(
                workspaceInviteDomain.validateInviteToken
            ).toHaveBeenCalledWith('raw-token');
            expect(
                workspaceInviteDomain.getWorkspaceOfInvite
            ).toHaveBeenCalledWith(invite);
            expect(userDomain.getNameById).toHaveBeenCalledWith('user-1');
            expect(workspaceUtil.mapInvitePreview).toHaveBeenCalledWith(
                workspace,
                invite,
                inviter
            );
        });

        it('validates nothing when the gate rejects', async () => {
            featureFlagDomain.validateFeatureFlagMetadata.mockRejectedValue(
                new FeatureFlagDisabledException()
            );

            await expect(
                service.previewInvite({ inviteToken: 'raw-token' })
            ).rejects.toBeInstanceOf(FeatureFlagDisabledException);
            expect(
                workspaceInviteDomain.validateInviteToken
            ).not.toHaveBeenCalled();
        });

        it('throws WorkspaceInviteInvalidException when the invite workspace is not active', async () => {
            workspaceInviteDomain.validateInviteToken.mockResolvedValue(invite);
            workspaceInviteDomain.getWorkspaceOfInvite.mockRejectedValue(
                new WorkspaceInviteInvalidException()
            );
            userDomain.getNameById.mockResolvedValue(null);

            await expect(
                service.previewInvite({ inviteToken: 'raw-token' })
            ).rejects.toBeInstanceOf(WorkspaceInviteInvalidException);
            expect(workspaceUtil.mapInvitePreview).not.toHaveBeenCalled();
        });
    });
});
