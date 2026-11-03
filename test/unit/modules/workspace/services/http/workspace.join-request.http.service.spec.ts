import { Test } from '@nestjs/testing';
import type { TestingModule } from '@nestjs/testing';
import { mock } from 'vitest-mock-extended';
import type { MockProxy } from 'vitest-mock-extended';
import { PaginationStoreKey } from '@common/pagination/constants/pagination.constant';
import { EnumPaginationType } from '@common/pagination/enums/pagination.enum';
import type { IPaginationQueryCursorParams } from '@common/pagination/interfaces/pagination.interface';
import { PaginationQueryUtil } from '@common/pagination/utils/pagination.query.util';
import { RequestStoreService } from '@common/request/services/request.store.service';
import type { IResponsePaginationReturn } from '@common/response/interfaces/response.interface';
import {
    EnumActivityLogAction,
    EnumUserLoginFrom,
    EnumUserLoginWith,
    EnumUserSignUpFrom,
    EnumUserSignUpWith,
    EnumUserStatus,
    EnumWorkspaceJoinRejectReason,
    EnumWorkspaceJoinRequestStatus,
    Prisma,
} from '@generated/prisma-client/client';
import type {
    User,
    Workspace,
    WorkspaceJoinRequest,
} from '@generated/prisma-client/client';
import { ActivityLogDomain } from '@modules/activity-log/domains/activity-log.domain';
import type { IActivityLogStaged } from '@modules/activity-log/interfaces/activity-log.interface';
import { FeatureFlagDomain } from '@modules/feature-flag/domains/feature-flag.domain';
import { FeatureFlagDisabledException } from '@modules/feature-flag/exceptions/feature-flag.disabled.exception';
import { DeviceDomain } from '@modules/device/domains/device.domain';
import { NotificationDomain } from '@modules/notification/domains/notification.domain';
import { EnumNotificationKind } from '@modules/notification/enums/notification.enum';
import type { INotificationRecipient } from '@modules/notification/interfaces/notification.interface';
import { NotificationQueue } from '@modules/notification/queues/notification.queue';
import { NotificationUtil } from '@modules/notification/utils/notification.util';
import { UserDomain } from '@modules/user/domains/user.domain';
import {
    WorkspaceJoinRequestDefaultAvailableOrderBy,
    WorkspaceJoinRequestDefaultStatus,
} from '@modules/workspace/constants/workspace.list.constant';
import type { WorkspaceJoinRequestCreateRequestDto } from '@modules/workspace/dtos/request/workspace.join-request-create.request.dto';
import type { WorkspaceJoinRequestListRequestDto } from '@modules/workspace/dtos/request/workspace.join-request-list.request.dto';
import type { WorkspaceJoinRequestRejectRequestDto } from '@modules/workspace/dtos/request/workspace.join-request-reject.request.dto';
import { WorkspaceJoinRequestDomain } from '@modules/workspace/domains/workspace.join-request.domain';
import { WorkspaceMemberDomain } from '@modules/workspace/domains/workspace.member.domain';
import { WorkspaceJoinRequestAlreadyProcessedException } from '@modules/workspace/exceptions/workspace.join-request-already-processed.exception';
import { WorkspaceJoinRequestNotFoundException } from '@modules/workspace/exceptions/workspace.join-request-not-found.exception';
import { WorkspaceNotPublicException } from '@modules/workspace/exceptions/workspace.not-public.exception';
import { WorkspaceJoinRequestHttpService } from '@modules/workspace/services/http/workspace.join-request.http.service';
import { WorkspaceUtil } from '@modules/workspace/utils/workspace.util';
import { TestRecipient } from '@test/unit/helpers/test.unit.notification-push.helper';

describe('WorkspaceJoinRequestHttpService', () => {
    const workspaceJoinRequestDomain: MockProxy<WorkspaceJoinRequestDomain> =
        mock<WorkspaceJoinRequestDomain>();
    const workspaceMemberDomain: MockProxy<WorkspaceMemberDomain> =
        mock<WorkspaceMemberDomain>();
    const userDomain: MockProxy<UserDomain> = mock<UserDomain>();
    const deviceDomain: MockProxy<DeviceDomain> = mock<DeviceDomain>();
    const notificationDomain: MockProxy<NotificationDomain> =
        mock<NotificationDomain>();
    const notificationUtil: MockProxy<NotificationUtil> =
        mock<NotificationUtil>();
    const featureFlagDomain: MockProxy<FeatureFlagDomain> =
        mock<FeatureFlagDomain>();
    const activityLogDomain: MockProxy<ActivityLogDomain> =
        mock<ActivityLogDomain>();
    const notificationQueue: MockProxy<NotificationQueue> =
        mock<NotificationQueue>();
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
        isPublic: true,
    };

    const joinRequest: WorkspaceJoinRequest = {
        id: 'join-request-1',
        createdAt: new Date('2026-01-01T00:00:00.000Z'),
        createdBy: 'user-2',
        updatedAt: new Date('2026-01-01T00:00:00.000Z'),
        updatedBy: 'user-2',
        workspaceId: 'workspace-1',
        userId: 'user-2',
        status: EnumWorkspaceJoinRequestStatus.pending,
        message: 'Please let me in',
        rejectReasonCode: null,
        reviewedByUserId: null,
        reviewedAt: null,
        pendingKey: 'workspace-1:user-2',
    };

    const reviewer: User = {
        id: 'reviewer-1',
        name: 'Rey Viewer',
        username: 'reviewer',
        isVerified: true,
        verifiedAt: new Date('2026-01-01T00:00:00.000Z'),
        email: 'reviewer@example.com',
        roleId: 'role-id',
        password: 'hashed',
        passwordExpired: null,
        passwordCreated: null,
        passwordAttempt: 0,
        signUpAt: new Date('2026-01-01T00:00:00.000Z'),
        signUpFrom: EnumUserSignUpFrom.website,
        signUpWith: EnumUserSignUpWith.credential,
        status: EnumUserStatus.active,
        gender: null,
        countryId: 'country-id',
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

    const requester: User = {
        ...reviewer,
        id: 'user-2',
        name: 'Jane Doe',
        username: 'jane',
        email: 'jane@example.com',
    };

    const notificationTokens = ['token-1'];

    const recipient: INotificationRecipient = {
        ...TestRecipient,
        userId: 'user-2',
    };
    const reviewerRecipient: INotificationRecipient = {
        ...TestRecipient,
        userId: 'reviewer-1',
    };

    const stagedActivityLog: IActivityLogStaged = {
        action: EnumActivityLogAction.workspaceJoinRequested,
        metadata: {},
        userId: null,
        createdBy: null,
        workspaceId: null,
    };

    const cursorPagination: IPaginationQueryCursorParams<Prisma.WorkspaceJoinRequestWhereInput> =
        { limit: 20, orderBy: [] };

    let service: WorkspaceJoinRequestHttpService;

    beforeEach(async () => {
        vi.resetAllMocks();
        activityLogDomain.prepare.mockReturnValue(stagedActivityLog);
        deviceDomain.getNotificationTokens.mockResolvedValue(
            notificationTokens
        );
        notificationDomain.getListUserSetting.mockResolvedValue([]);
        paginationQueryUtil.cursor.mockReturnValue({
            params: cursorPagination,
            storePatch: {},
        });

        const module: TestingModule = await Test.createTestingModule({
            providers: [
                WorkspaceJoinRequestHttpService,
                {
                    provide: WorkspaceJoinRequestDomain,
                    useValue: workspaceJoinRequestDomain,
                },
                {
                    provide: WorkspaceMemberDomain,
                    useValue: workspaceMemberDomain,
                },
                { provide: UserDomain, useValue: userDomain },
                { provide: DeviceDomain, useValue: deviceDomain },
                { provide: NotificationDomain, useValue: notificationDomain },
                { provide: NotificationUtil, useValue: notificationUtil },
                { provide: FeatureFlagDomain, useValue: featureFlagDomain },
                { provide: ActivityLogDomain, useValue: activityLogDomain },
                { provide: NotificationQueue, useValue: notificationQueue },
                { provide: WorkspaceUtil, useValue: workspaceUtil },
                {
                    provide: PaginationQueryUtil,
                    useValue: paginationQueryUtil,
                },
                { provide: RequestStoreService, useValue: requestStoreService },
            ],
        }).compile();

        service = module.get(WorkspaceJoinRequestHttpService);
    });

    describe('createJoinRequest', () => {
        const body: WorkspaceJoinRequestCreateRequestDto = {
            workspaceId: 'workspace-1',
            message: 'Please let me in',
        };

        beforeEach(() => {
            workspaceJoinRequestDomain.getJoinableWorkspace.mockResolvedValue(
                workspace
            );
            workspaceJoinRequestDomain.createJoinRequest.mockResolvedValue(
                joinRequest
            );
            userDomain.getNameById.mockResolvedValue({
                name: 'Jane Doe',
                username: 'jane',
            });
            workspaceUtil.resolveRequesterName.mockReturnValue('Jane Doe');
            workspaceMemberDomain.getReviewerUserIds.mockResolvedValue([
                'reviewer-1',
            ]);
            userDomain.getManyActiveByIds.mockResolvedValue([reviewer]);
            notificationUtil.mapRecipient.mockReturnValue(reviewerRecipient);
            workspaceUtil.buildJoinRequestReviewLink.mockReturnValue(
                'https://app.example.com/review/join-request-1'
            );
        });

        it('gates on the flag, reads the target, creates the request, stages the activity, and notifies the reviewers in order', async () => {
            const callOrder: string[] = [];
            featureFlagDomain.validateFeatureFlagMetadata.mockImplementation(
                async () => {
                    callOrder.push('gate');
                }
            );
            workspaceJoinRequestDomain.getJoinableWorkspace.mockImplementation(
                async () => {
                    callOrder.push('joinable');

                    return workspace;
                }
            );
            userDomain.getNameById.mockImplementation(async () => {
                callOrder.push('requesterName');

                return { name: 'Jane Doe', username: 'jane' };
            });
            notificationUtil.mapRecipient.mockImplementation(() => {
                callOrder.push('reviewerRecipient');

                return reviewerRecipient;
            });
            workspaceJoinRequestDomain.createJoinRequest.mockImplementation(
                async () => {
                    callOrder.push('create');

                    return joinRequest;
                }
            );
            activityLogDomain.stagePrepared.mockImplementation(() => {
                callOrder.push('stage');
            });
            notificationQueue.sendWorkspaceJoinRequestBulk.mockImplementation(
                async () => {
                    callOrder.push('notify');
                }
            );

            const result = await service.createJoinRequest('user-2', body);

            expect(result).toEqual({ data: joinRequest });
            expect(callOrder.slice(0, 2)).toEqual(['gate', 'joinable']);
            expect(callOrder.slice(-3)).toEqual(['create', 'stage', 'notify']);
            expect(
                featureFlagDomain.validateFeatureFlagMetadata
            ).toHaveBeenCalledWith('workspace', 'joinRequestAllowed');
            expect(
                workspaceJoinRequestDomain.getJoinableWorkspace
            ).toHaveBeenCalledWith('user-2', 'workspace-1');
            expect(
                workspaceJoinRequestDomain.createJoinRequest
            ).toHaveBeenCalledWith('user-2', {
                workspaceId: 'workspace-1',
                message: 'Please let me in',
            });
            expect(activityLogDomain.prepare).toHaveBeenCalledWith({
                action: EnumActivityLogAction.workspaceJoinRequested,
                userId: 'user-2',
                createdBy: 'user-2',
                workspaceId: 'workspace-1',
            });
            expect(activityLogDomain.stagePrepared).toHaveBeenCalledWith([
                stagedActivityLog,
            ]);
            expect(
                workspaceMemberDomain.getReviewerUserIds
            ).toHaveBeenCalledWith('workspace-1');
            expect(userDomain.getManyActiveByIds).toHaveBeenCalledWith([
                'reviewer-1',
            ]);
            expect(deviceDomain.getNotificationTokens).toHaveBeenCalledWith(
                'reviewer-1'
            );
            expect(notificationDomain.getListUserSetting).toHaveBeenCalledWith(
                'reviewer-1'
            );
            expect(notificationUtil.mapRecipient).toHaveBeenCalledWith(
                reviewer,
                EnumNotificationKind.workspaceJoinRequest,
                ['token-1'],
                []
            );
            expect(
                notificationQueue.sendWorkspaceJoinRequestBulk
            ).toHaveBeenCalledWith(
                [reviewerRecipient],
                {
                    workspaceId: 'workspace-1',
                    workspaceName: 'Acme',
                    requesterName: 'Jane Doe',
                    joinRequestId: 'join-request-1',
                    joinRequestReviewLink:
                        'https://app.example.com/review/join-request-1',
                },
                'user-2'
            );
        });

        it('passes null for an omitted message', async () => {
            await service.createJoinRequest('user-2', {
                workspaceId: 'workspace-1',
            });

            expect(
                workspaceJoinRequestDomain.createJoinRequest
            ).toHaveBeenCalledWith('user-2', {
                workspaceId: 'workspace-1',
                message: null,
            });
        });

        it('notifies nobody when the workspace has no active reviewer', async () => {
            workspaceMemberDomain.getReviewerUserIds.mockResolvedValue([]);
            userDomain.getManyActiveByIds.mockResolvedValue([]);

            const result = await service.createJoinRequest('user-2', body);

            expect(result).toEqual({ data: joinRequest });
            expect(
                notificationQueue.sendWorkspaceJoinRequestBulk
            ).not.toHaveBeenCalled();
            expect(
                workspaceUtil.buildJoinRequestReviewLink
            ).not.toHaveBeenCalled();
        });

        it('reads nothing when the gate rejects', async () => {
            featureFlagDomain.validateFeatureFlagMetadata.mockRejectedValue(
                new FeatureFlagDisabledException()
            );

            await expect(
                service.createJoinRequest('user-2', body)
            ).rejects.toBeInstanceOf(FeatureFlagDisabledException);
            expect(
                workspaceJoinRequestDomain.getJoinableWorkspace
            ).not.toHaveBeenCalled();
        });

        it('reads no target when the workspace is not joinable', async () => {
            workspaceJoinRequestDomain.getJoinableWorkspace.mockRejectedValue(
                new WorkspaceNotPublicException()
            );

            await expect(
                service.createJoinRequest('user-2', body)
            ).rejects.toBeInstanceOf(WorkspaceNotPublicException);
            expect(userDomain.getNameById).not.toHaveBeenCalled();
            expect(
                workspaceJoinRequestDomain.createJoinRequest
            ).not.toHaveBeenCalled();
        });

        it('creates nothing and stages nothing when a reviewer recipient read rejects', async () => {
            const failure = new Error('read-failed');
            deviceDomain.getNotificationTokens.mockRejectedValue(failure);

            await expect(
                service.createJoinRequest('user-2', body)
            ).rejects.toBe(failure);
            expect(
                workspaceJoinRequestDomain.createJoinRequest
            ).not.toHaveBeenCalled();
            expect(activityLogDomain.stagePrepared).not.toHaveBeenCalled();
        });

        it('stages nothing and notifies nobody when the create rejects', async () => {
            workspaceJoinRequestDomain.createJoinRequest.mockRejectedValue(
                new WorkspaceNotPublicException()
            );

            await expect(
                service.createJoinRequest('user-2', body)
            ).rejects.toBeInstanceOf(WorkspaceNotPublicException);
            expect(activityLogDomain.stagePrepared).not.toHaveBeenCalled();
            expect(
                notificationQueue.sendWorkspaceJoinRequestBulk
            ).not.toHaveBeenCalled();
        });
    });

    describe('getJoinRequestsList', () => {
        it('gates on the flag before listing', async () => {
            featureFlagDomain.validateFeatureFlagMetadata.mockRejectedValue(
                new FeatureFlagDisabledException()
            );

            await expect(
                service.getJoinRequestsList('workspace-1', {})
            ).rejects.toBeInstanceOf(FeatureFlagDisabledException);
            expect(
                workspaceJoinRequestDomain.getJoinRequestsList
            ).not.toHaveBeenCalled();
        });

        it('parses the cursor query, merges the status filter, and returns the page', async () => {
            const query: WorkspaceJoinRequestListRequestDto = {
                status: 'pending',
            };
            const statusFilter = {
                where: {
                    status: { in: [EnumWorkspaceJoinRequestStatus.pending] },
                },
                storeFilter: {
                    status: [EnumWorkspaceJoinRequestStatus.pending],
                },
            };
            paginationQueryUtil.inEnum.mockReturnValue(statusFilter);
            const page: IResponsePaginationReturn<WorkspaceJoinRequest> = {
                type: EnumPaginationType.cursor,
                perPage: 20,
                hasNext: false,
                data: [],
            };
            workspaceJoinRequestDomain.getJoinRequestsList.mockResolvedValue(
                page
            );

            await service.getJoinRequestsList('workspace-1', query);

            expect(paginationQueryUtil.cursor).toHaveBeenCalledWith(query, {
                availableOrderBy: WorkspaceJoinRequestDefaultAvailableOrderBy,
            });
            expect(paginationQueryUtil.inEnum).toHaveBeenCalledWith(
                Prisma.WorkspaceJoinRequestScalarFieldEnum.status,
                'pending',
                WorkspaceJoinRequestDefaultStatus
            );
            expect(requestStoreService.merge).toHaveBeenCalledWith(
                PaginationStoreKey,
                {
                    filters: {
                        status: [EnumWorkspaceJoinRequestStatus.pending],
                    },
                }
            );
            expect(
                workspaceJoinRequestDomain.getJoinRequestsList
            ).toHaveBeenCalledWith(
                'workspace-1',
                cursorPagination,
                statusFilter.where
            );
        });

        it('merges an empty filter set when status is absent', async () => {
            paginationQueryUtil.inEnum.mockReturnValue(null);
            const page: IResponsePaginationReturn<WorkspaceJoinRequest> = {
                type: EnumPaginationType.cursor,
                perPage: 20,
                hasNext: false,
                data: [],
            };
            workspaceJoinRequestDomain.getJoinRequestsList.mockResolvedValue(
                page
            );

            await service.getJoinRequestsList('workspace-1', {});

            expect(requestStoreService.merge).toHaveBeenCalledWith(
                PaginationStoreKey,
                { filters: {} }
            );
        });
    });

    describe('acceptJoinRequest', () => {
        beforeEach(() => {
            workspaceJoinRequestDomain.getPendingById.mockResolvedValue(
                joinRequest
            );
            userDomain.getOneActive.mockResolvedValue(requester);
            notificationUtil.mapRecipient.mockReturnValue(recipient);
        });

        it('gates, reads the pending request and recipient, accepts, stages the rows, and notifies in order', async () => {
            const callOrder: string[] = [];
            featureFlagDomain.validateFeatureFlagMetadata.mockImplementation(
                async () => {
                    callOrder.push('gate');
                }
            );
            workspaceJoinRequestDomain.getPendingById.mockImplementation(
                async () => {
                    callOrder.push('pending');

                    return joinRequest;
                }
            );
            notificationUtil.mapRecipient.mockImplementation(() => {
                callOrder.push('recipient');

                return recipient;
            });
            workspaceJoinRequestDomain.acceptJoinRequest.mockImplementation(
                async () => {
                    callOrder.push('accept');
                }
            );
            activityLogDomain.stagePrepared.mockImplementation(() => {
                callOrder.push('stage');
            });
            notificationQueue.sendWorkspaceJoinAccepted.mockImplementation(
                async () => {
                    callOrder.push('notify');
                }
            );

            const result = await service.acceptJoinRequest(
                workspace,
                'reviewer-1',
                'join-request-1'
            );

            expect(result).toEqual({});
            expect(callOrder).toEqual([
                'gate',
                'pending',
                'recipient',
                'accept',
                'stage',
                'notify',
            ]);
            expect(
                featureFlagDomain.validateFeatureFlagMetadata
            ).toHaveBeenCalledWith('workspace', 'joinRequestAllowed');
            expect(
                workspaceJoinRequestDomain.getPendingById
            ).toHaveBeenCalledWith('join-request-1', 'workspace-1');
            expect(userDomain.getOneActive).toHaveBeenCalledWith('user-2');
            expect(deviceDomain.getNotificationTokens).toHaveBeenCalledWith(
                'user-2'
            );
            expect(notificationDomain.getListUserSetting).toHaveBeenCalledWith(
                'user-2'
            );
            expect(notificationUtil.mapRecipient).toHaveBeenCalledWith(
                requester,
                EnumNotificationKind.workspaceJoinAccepted,
                ['token-1'],
                []
            );
            expect(
                workspaceJoinRequestDomain.acceptJoinRequest
            ).toHaveBeenCalledWith(joinRequest, 'reviewer-1');
            expect(activityLogDomain.prepare).toHaveBeenCalledTimes(2);
            expect(activityLogDomain.prepare).toHaveBeenNthCalledWith(1, {
                action: EnumActivityLogAction.workspaceJoinAccepted,
                userId: 'reviewer-1',
                createdBy: 'reviewer-1',
                workspaceId: 'workspace-1',
                metadata: { targetUserId: 'user-2' },
            });
            expect(activityLogDomain.prepare).toHaveBeenNthCalledWith(2, {
                action: EnumActivityLogAction.workspaceJoinAcceptedByAdmin,
                userId: 'user-2',
                createdBy: 'reviewer-1',
                workspaceId: 'workspace-1',
                metadata: { actorUserId: 'reviewer-1' },
            });
            expect(activityLogDomain.stagePrepared).toHaveBeenCalledWith([
                stagedActivityLog,
                stagedActivityLog,
            ]);
            expect(
                notificationQueue.sendWorkspaceJoinAccepted
            ).toHaveBeenCalledWith(
                recipient,
                { workspaceId: 'workspace-1', workspaceName: 'Acme' },
                'reviewer-1',
                'join-request-1'
            );
        });

        it('prepares a single row when the reviewer is the requester', async () => {
            await service.acceptJoinRequest(
                workspace,
                'user-2',
                'join-request-1'
            );

            expect(activityLogDomain.prepare).toHaveBeenCalledTimes(1);
            expect(activityLogDomain.stagePrepared).toHaveBeenCalledWith([
                stagedActivityLog,
            ]);
        });

        it('accepts without notifying when the requester is no longer active', async () => {
            userDomain.getOneActive.mockResolvedValue(null);

            await service.acceptJoinRequest(
                workspace,
                'reviewer-1',
                'join-request-1'
            );

            expect(
                workspaceJoinRequestDomain.acceptJoinRequest
            ).toHaveBeenCalled();
            expect(
                notificationQueue.sendWorkspaceJoinAccepted
            ).not.toHaveBeenCalled();
        });

        it('reads nothing when the gate rejects', async () => {
            featureFlagDomain.validateFeatureFlagMetadata.mockRejectedValue(
                new FeatureFlagDisabledException()
            );

            await expect(
                service.acceptJoinRequest(
                    workspace,
                    'reviewer-1',
                    'join-request-1'
                )
            ).rejects.toBeInstanceOf(FeatureFlagDisabledException);
            expect(
                workspaceJoinRequestDomain.getPendingById
            ).not.toHaveBeenCalled();
        });

        it('stops before the recipient read when the request is not pending', async () => {
            workspaceJoinRequestDomain.getPendingById.mockRejectedValue(
                new WorkspaceJoinRequestNotFoundException()
            );

            await expect(
                service.acceptJoinRequest(
                    workspace,
                    'reviewer-1',
                    'join-request-1'
                )
            ).rejects.toBeInstanceOf(WorkspaceJoinRequestNotFoundException);
            expect(userDomain.getOneActive).not.toHaveBeenCalled();
        });

        it('accepts nothing when the recipient read rejects', async () => {
            const failure = new Error('read-failed');
            deviceDomain.getNotificationTokens.mockRejectedValue(failure);

            await expect(
                service.acceptJoinRequest(
                    workspace,
                    'reviewer-1',
                    'join-request-1'
                )
            ).rejects.toBe(failure);
            expect(
                workspaceJoinRequestDomain.acceptJoinRequest
            ).not.toHaveBeenCalled();
            expect(activityLogDomain.stagePrepared).not.toHaveBeenCalled();
        });

        it('stages nothing and notifies nobody when the accept rejects', async () => {
            workspaceJoinRequestDomain.acceptJoinRequest.mockRejectedValue(
                new WorkspaceJoinRequestAlreadyProcessedException()
            );

            await expect(
                service.acceptJoinRequest(
                    workspace,
                    'reviewer-1',
                    'join-request-1'
                )
            ).rejects.toBeInstanceOf(
                WorkspaceJoinRequestAlreadyProcessedException
            );
            expect(activityLogDomain.stagePrepared).not.toHaveBeenCalled();
            expect(
                notificationQueue.sendWorkspaceJoinAccepted
            ).not.toHaveBeenCalled();
        });
    });

    describe('rejectJoinRequest', () => {
        const body: WorkspaceJoinRequestRejectRequestDto = {
            rejectReasonCode: EnumWorkspaceJoinRejectReason.wrongWorkspace,
        };

        beforeEach(() => {
            workspaceJoinRequestDomain.getPendingById.mockResolvedValue(
                joinRequest
            );
            userDomain.getOneActive.mockResolvedValue(requester);
            notificationUtil.mapRecipient.mockReturnValue(recipient);
        });

        it('gates, reads the pending request and recipient, rejects, stages the rows, and notifies in order', async () => {
            const callOrder: string[] = [];
            featureFlagDomain.validateFeatureFlagMetadata.mockImplementation(
                async () => {
                    callOrder.push('gate');
                }
            );
            workspaceJoinRequestDomain.getPendingById.mockImplementation(
                async () => {
                    callOrder.push('pending');

                    return joinRequest;
                }
            );
            notificationUtil.mapRecipient.mockImplementation(() => {
                callOrder.push('recipient');

                return recipient;
            });
            workspaceJoinRequestDomain.rejectJoinRequest.mockImplementation(
                async () => {
                    callOrder.push('reject');
                }
            );
            activityLogDomain.stagePrepared.mockImplementation(() => {
                callOrder.push('stage');
            });
            notificationQueue.sendWorkspaceJoinRejected.mockImplementation(
                async () => {
                    callOrder.push('notify');
                }
            );

            const result = await service.rejectJoinRequest(
                workspace,
                'reviewer-1',
                'join-request-1',
                body
            );

            expect(result).toEqual({});
            expect(callOrder).toEqual([
                'gate',
                'pending',
                'recipient',
                'reject',
                'stage',
                'notify',
            ]);
            expect(userDomain.getOneActive).toHaveBeenCalledWith('user-2');
            expect(deviceDomain.getNotificationTokens).toHaveBeenCalledWith(
                'user-2'
            );
            expect(notificationDomain.getListUserSetting).toHaveBeenCalledWith(
                'user-2'
            );
            expect(notificationUtil.mapRecipient).toHaveBeenCalledWith(
                requester,
                EnumNotificationKind.workspaceJoinRejected,
                ['token-1'],
                []
            );
            expect(
                workspaceJoinRequestDomain.rejectJoinRequest
            ).toHaveBeenCalledWith(
                'join-request-1',
                'reviewer-1',
                EnumWorkspaceJoinRejectReason.wrongWorkspace
            );
            expect(activityLogDomain.prepare).toHaveBeenNthCalledWith(1, {
                action: EnumActivityLogAction.workspaceJoinRejected,
                userId: 'reviewer-1',
                createdBy: 'reviewer-1',
                workspaceId: 'workspace-1',
                metadata: { targetUserId: 'user-2' },
            });
            expect(activityLogDomain.prepare).toHaveBeenNthCalledWith(2, {
                action: EnumActivityLogAction.workspaceJoinRejectedByAdmin,
                userId: 'user-2',
                createdBy: 'reviewer-1',
                workspaceId: 'workspace-1',
                metadata: { actorUserId: 'reviewer-1' },
            });
            expect(activityLogDomain.stagePrepared).toHaveBeenCalledWith([
                stagedActivityLog,
                stagedActivityLog,
            ]);
            expect(
                notificationQueue.sendWorkspaceJoinRejected
            ).toHaveBeenCalledWith(
                recipient,
                {
                    workspaceId: 'workspace-1',
                    workspaceName: 'Acme',
                    rejectReasonCode:
                        EnumWorkspaceJoinRejectReason.wrongWorkspace,
                },
                'reviewer-1',
                'join-request-1'
            );
        });

        it('prepares a single row when the reviewer is the requester', async () => {
            await service.rejectJoinRequest(
                workspace,
                'user-2',
                'join-request-1',
                body
            );

            expect(activityLogDomain.prepare).toHaveBeenCalledTimes(1);
        });

        it('rejects without notifying when the requester is no longer active', async () => {
            userDomain.getOneActive.mockResolvedValue(null);

            await service.rejectJoinRequest(
                workspace,
                'reviewer-1',
                'join-request-1',
                body
            );

            expect(
                workspaceJoinRequestDomain.rejectJoinRequest
            ).toHaveBeenCalled();
            expect(
                notificationQueue.sendWorkspaceJoinRejected
            ).not.toHaveBeenCalled();
        });

        it('reads nothing when the gate rejects', async () => {
            featureFlagDomain.validateFeatureFlagMetadata.mockRejectedValue(
                new FeatureFlagDisabledException()
            );

            await expect(
                service.rejectJoinRequest(
                    workspace,
                    'reviewer-1',
                    'join-request-1',
                    body
                )
            ).rejects.toBeInstanceOf(FeatureFlagDisabledException);
            expect(
                workspaceJoinRequestDomain.getPendingById
            ).not.toHaveBeenCalled();
        });

        it('rejects nothing when the recipient read rejects', async () => {
            const failure = new Error('read-failed');
            deviceDomain.getNotificationTokens.mockRejectedValue(failure);

            await expect(
                service.rejectJoinRequest(
                    workspace,
                    'reviewer-1',
                    'join-request-1',
                    body
                )
            ).rejects.toBe(failure);
            expect(
                workspaceJoinRequestDomain.rejectJoinRequest
            ).not.toHaveBeenCalled();
            expect(activityLogDomain.stagePrepared).not.toHaveBeenCalled();
        });

        it('stages nothing and notifies nobody when the reject rejects', async () => {
            workspaceJoinRequestDomain.rejectJoinRequest.mockRejectedValue(
                new WorkspaceJoinRequestAlreadyProcessedException()
            );

            await expect(
                service.rejectJoinRequest(
                    workspace,
                    'reviewer-1',
                    'join-request-1',
                    body
                )
            ).rejects.toBeInstanceOf(
                WorkspaceJoinRequestAlreadyProcessedException
            );
            expect(activityLogDomain.stagePrepared).not.toHaveBeenCalled();
            expect(
                notificationQueue.sendWorkspaceJoinRejected
            ).not.toHaveBeenCalled();
        });
    });
});
