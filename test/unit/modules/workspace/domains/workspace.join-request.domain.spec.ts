import { Test } from '@nestjs/testing';
import type { TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { mock } from 'vitest-mock-extended';
import type { MockProxy } from 'vitest-mock-extended';
import type { IDatabaseTransactionClient } from '@common/database/interfaces/database.client.interface';
import { DatabaseService } from '@common/database/services/database.service';
import { HelperDateService } from '@common/helper/services/helper.date.service';
import { HelperStringService } from '@common/helper/services/helper.string.service';
import { EnumPaginationType } from '@common/pagination/enums/pagination.enum';
import type { IPaginationQueryCursorParams } from '@common/pagination/interfaces/pagination.interface';
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
    EnumWorkspaceMemberRole,
} from '@generated/prisma-client/client';
import type {
    Prisma,
    User,
    Workspace,
    WorkspaceJoinRequest,
} from '@generated/prisma-client/client';
import type { IActivityLogStaged } from '@modules/activity-log/interfaces/activity-log.interface';
import { ActivityLogDomain } from '@modules/activity-log/domains/activity-log.domain';
import { FeatureFlagDomain } from '@modules/feature-flag/domains/feature-flag.domain';
import { EnumNotificationKind } from '@modules/notification/enums/notification.enum';
import type { INotificationRecipient } from '@modules/notification/interfaces/notification.interface';
import { NotificationRecipientDomain } from '@modules/notification/domains/notification.recipient.domain';
import { NotificationQueue } from '@modules/notification/queues/notification.queue';
import { UserDomain } from '@modules/user/domains/user.domain';
import { WorkspaceJoinRequestDomain } from '@modules/workspace/domains/workspace.join-request.domain';
import { WorkspaceMemberDomain } from '@modules/workspace/domains/workspace.member.domain';
import { EnumWorkspaceStatusCodeError } from '@modules/workspace/enums/workspace.status-code.enum';
import { WorkspaceJoinRequestAlreadyMemberException } from '@modules/workspace/exceptions/workspace.join-request-already-member.exception';
import { WorkspaceJoinRequestAlreadyProcessedException } from '@modules/workspace/exceptions/workspace.join-request-already-processed.exception';
import { WorkspaceJoinRequestDuplicateException } from '@modules/workspace/exceptions/workspace.join-request-duplicate.exception';
import { WorkspaceJoinRequestNotFoundException } from '@modules/workspace/exceptions/workspace.join-request-not-found.exception';
import { WorkspaceNotFoundException } from '@modules/workspace/exceptions/workspace.not-found.exception';
import { WorkspaceNotPublicException } from '@modules/workspace/exceptions/workspace.not-public.exception';
import type { IWorkspaceJoinRequestCreate } from '@modules/workspace/interfaces/workspace.interface';
import { WorkspaceJoinRequestRepository } from '@modules/workspace/repositories/workspace.join-request.repository';
import { WorkspaceMemberRepository } from '@modules/workspace/repositories/workspace.member.repository';
import { WorkspaceRepository } from '@modules/workspace/repositories/workspace.repository';
import { TestRecipient } from '@test/unit/helpers/test.unit.notification-push.helper';

describe('WorkspaceJoinRequestDomain', () => {
    const workspaceJoinRequestRepository: MockProxy<WorkspaceJoinRequestRepository> =
        mock<WorkspaceJoinRequestRepository>();
    const workspaceMemberRepository: MockProxy<WorkspaceMemberRepository> =
        mock<WorkspaceMemberRepository>();
    const workspaceRepository: MockProxy<WorkspaceRepository> =
        mock<WorkspaceRepository>();
    const workspaceMemberDomain: MockProxy<WorkspaceMemberDomain> =
        mock<WorkspaceMemberDomain>();
    const userDomain: MockProxy<UserDomain> = mock<UserDomain>();
    const activityLogDomain: MockProxy<ActivityLogDomain> =
        mock<ActivityLogDomain>();
    const databaseService: MockProxy<DatabaseService> = mock<DatabaseService>();
    const helperDateService: MockProxy<HelperDateService> =
        mock<HelperDateService>();
    const helperStringService: MockProxy<HelperStringService> =
        mock<HelperStringService>();
    const configGet = vi.fn<(key: string) => unknown>();
    const configService: MockProxy<ConfigService> = mock<ConfigService>({
        get: configGet as ConfigService['get'],
    });
    const notificationQueue: MockProxy<NotificationQueue> =
        mock<NotificationQueue>();
    const notificationRecipientDomain: MockProxy<NotificationRecipientDomain> =
        mock<NotificationRecipientDomain>();
    const featureFlagDomain: MockProxy<FeatureFlagDomain> =
        mock<FeatureFlagDomain>();

    const configValues: Record<string, unknown> = {
        'home.url': 'https://app.example.com',
        'workspace.joinRequest.reviewLinkPattern':
            '{homeUrl}/review/{joinRequestId}',
    };

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

    const baseJoinRequest: WorkspaceJoinRequest = {
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
    };

    const requester: User = {
        id: 'user-2',
        name: 'Jane Doe',
        username: 'userTwo',
        isVerified: true,
        verifiedAt: new Date('2026-01-01T00:00:00.000Z'),
        email: 'user2@example.com',
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
        termPolicy: {
            termsOfService: true,
            privacy: true,
            marketing: false,
            cookies: false,
        },
        photo: null,
        createdAt: new Date('2026-01-01T00:00:00.000Z'),
        createdBy: null,
        updatedAt: new Date('2026-01-01T00:00:00.000Z'),
        updatedBy: null,
        deletedAt: null,
        deletedBy: null,
    };
    const recipient: INotificationRecipient = {
        ...TestRecipient,
        userId: 'user-2',
    };

    let domain: WorkspaceJoinRequestDomain;

    beforeEach(async () => {
        vi.resetAllMocks();
        configGet.mockImplementation((key: string) => configValues[key]);
        userDomain.getOneActive.mockResolvedValue(requester);
        userDomain.getManyActiveByIds.mockResolvedValue([]);
        notificationRecipientDomain.getRecipient.mockResolvedValue(recipient);

        const module: TestingModule = await Test.createTestingModule({
            providers: [
                WorkspaceJoinRequestDomain,
                {
                    provide: WorkspaceJoinRequestRepository,
                    useValue: workspaceJoinRequestRepository,
                },
                {
                    provide: WorkspaceMemberRepository,
                    useValue: workspaceMemberRepository,
                },
                { provide: WorkspaceRepository, useValue: workspaceRepository },
                {
                    provide: WorkspaceMemberDomain,
                    useValue: workspaceMemberDomain,
                },
                { provide: UserDomain, useValue: userDomain },
                { provide: ActivityLogDomain, useValue: activityLogDomain },
                { provide: DatabaseService, useValue: databaseService },
                { provide: HelperDateService, useValue: helperDateService },
                {
                    provide: HelperStringService,
                    useValue: helperStringService,
                },
                { provide: ConfigService, useValue: configService },
                { provide: NotificationQueue, useValue: notificationQueue },
                {
                    provide: NotificationRecipientDomain,
                    useValue: notificationRecipientDomain,
                },
                { provide: FeatureFlagDomain, useValue: featureFlagDomain },
            ],
        }).compile();

        domain = module.get(WorkspaceJoinRequestDomain);
    });

    describe('createJoinRequest', () => {
        const create: IWorkspaceJoinRequestCreate = {
            workspaceId: 'workspace-1',
            message: 'Please let me in',
        };

        beforeEach(() => {
            helperStringService.fillPattern.mockReturnValue(
                'https://app.example.com/review/join-request-1'
            );
            userDomain.getNameById.mockResolvedValue(null);
            workspaceMemberRepository.findReviewersByWorkspace.mockResolvedValue(
                []
            );
        });

        it('throws WorkspaceNotFoundException when the workspace does not exist', async () => {
            workspaceRepository.findActiveById.mockResolvedValue(null);

            await expect(
                domain.createJoinRequest('user-2', create)
            ).rejects.toMatchObject({
                constructor: WorkspaceNotFoundException,
                module: 'workspace',
                statusCode: EnumWorkspaceStatusCodeError.notFound,
                statusCodeKey:
                    EnumWorkspaceStatusCodeError[
                        EnumWorkspaceStatusCodeError.notFound
                    ],
                messagePath: 'workspace.error.notFound',
            });
            expect(
                featureFlagDomain.validateFeatureFlagMetadata
            ).toHaveBeenCalledWith('workspace', 'joinRequestAllowed');
        });

        it('throws WorkspaceNotPublicException when the workspace is not public', async () => {
            workspaceRepository.findActiveById.mockResolvedValue({
                ...workspace,
                isPublic: false,
            });

            await expect(
                domain.createJoinRequest('user-2', create)
            ).rejects.toMatchObject({
                constructor: WorkspaceNotPublicException,
                module: 'workspace',
                statusCode: EnumWorkspaceStatusCodeError.notPublic,
                statusCodeKey:
                    EnumWorkspaceStatusCodeError[
                        EnumWorkspaceStatusCodeError.notPublic
                    ],
                messagePath: 'workspace.error.notPublic',
            });
        });

        it('throws WorkspaceJoinRequestAlreadyMemberException when the caller is already a member', async () => {
            workspaceRepository.findActiveById.mockResolvedValue(workspace);
            workspaceMemberRepository.findOneByWorkspaceAndUser.mockResolvedValue(
                {
                    id: 'member-1',
                    createdAt: new Date('2026-01-01T00:00:00.000Z'),
                    createdBy: null,
                    updatedAt: new Date('2026-01-01T00:00:00.000Z'),
                    updatedBy: null,
                    workspaceId: 'workspace-1',
                    userId: 'user-2',
                    role: EnumWorkspaceMemberRole.member,
                    joinedAt: new Date('2026-01-01T00:00:00.000Z'),
                }
            );
            workspaceJoinRequestRepository.existsPendingByWorkspaceAndUser.mockResolvedValue(
                false
            );

            await expect(
                domain.createJoinRequest('user-2', create)
            ).rejects.toMatchObject({
                constructor: WorkspaceJoinRequestAlreadyMemberException,
                module: 'workspace',
                statusCode:
                    EnumWorkspaceStatusCodeError.joinRequestAlreadyMember,
                statusCodeKey:
                    EnumWorkspaceStatusCodeError[
                        EnumWorkspaceStatusCodeError.joinRequestAlreadyMember
                    ],
                messagePath: 'workspace.error.joinRequestAlreadyMember',
            });
        });

        it('throws WorkspaceJoinRequestDuplicateException when a pending request already exists', async () => {
            workspaceRepository.findActiveById.mockResolvedValue(workspace);
            workspaceMemberRepository.findOneByWorkspaceAndUser.mockResolvedValue(
                null
            );
            workspaceJoinRequestRepository.existsPendingByWorkspaceAndUser.mockResolvedValue(
                true
            );

            await expect(
                domain.createJoinRequest('user-2', create)
            ).rejects.toMatchObject({
                constructor: WorkspaceJoinRequestDuplicateException,
                module: 'workspace',
                statusCode: EnumWorkspaceStatusCodeError.joinRequestDuplicate,
                statusCodeKey:
                    EnumWorkspaceStatusCodeError[
                        EnumWorkspaceStatusCodeError.joinRequestDuplicate
                    ],
                messagePath: 'workspace.error.joinRequestDuplicate',
            });
        });

        it('creates the join request, stages the activity in order, and notifies the reviewers', async () => {
            workspaceRepository.findActiveById.mockResolvedValue(workspace);
            workspaceMemberRepository.findOneByWorkspaceAndUser.mockResolvedValue(
                null
            );
            workspaceJoinRequestRepository.existsPendingByWorkspaceAndUser.mockResolvedValue(
                false
            );
            const joinRequest = baseJoinRequest;
            const callOrder: string[] = [];
            workspaceJoinRequestRepository.createPending.mockImplementation(
                async () => {
                    callOrder.push('createPending');
                    return joinRequest;
                }
            );
            const stagedActivityLog: IActivityLogStaged = {
                action: EnumActivityLogAction.workspaceJoinRequested,
                metadata: {},
                onError: false,
                userId: null,
                createdBy: null,
                workspaceId: null,
            };
            activityLogDomain.prepare.mockReturnValue(stagedActivityLog);
            activityLogDomain.stagePrepared.mockImplementation(() => {
                callOrder.push('stagePrepared');
            });
            userDomain.getNameById.mockResolvedValue({
                name: 'Jane Doe',
                username: 'jane',
            });
            workspaceMemberRepository.findReviewersByWorkspace.mockResolvedValue(
                [{ userId: 'reviewer-1' }, { userId: 'reviewer-2' }]
            );
            const reviewers = [
                {
                    id: 'reviewer-1',
                    email: 'reviewer1@example.com',
                    username: 'reviewerOne',
                },
                {
                    id: 'reviewer-2',
                    email: 'reviewer2@example.com',
                    username: 'reviewerTwo',
                },
            ];
            const recipientOne: INotificationRecipient = {
                ...TestRecipient,
                userId: 'reviewer-1',
            };
            const recipientTwo: INotificationRecipient = {
                ...TestRecipient,
                userId: 'reviewer-2',
            };
            userDomain.getManyActiveByIds.mockResolvedValue(reviewers);
            notificationRecipientDomain.getRecipient
                .mockResolvedValueOnce(recipientOne)
                .mockResolvedValueOnce(recipientTwo);

            const result = await domain.createJoinRequest('user-2', create);

            expect(result).toBe(joinRequest);
            expect(activityLogDomain.prepare).toHaveBeenCalledWith({
                action: EnumActivityLogAction.workspaceJoinRequested,
                userId: 'user-2',
                createdBy: 'user-2',
                workspaceId: 'workspace-1',
            });
            expect(
                workspaceJoinRequestRepository.createPending
            ).toHaveBeenCalledWith({
                workspaceId: 'workspace-1',
                userId: 'user-2',
                message: 'Please let me in',
            });
            expect(activityLogDomain.stagePrepared).toHaveBeenCalledWith([
                stagedActivityLog,
            ]);
            expect(callOrder).toEqual(['createPending', 'stagePrepared']);
            expect(userDomain.getManyActiveByIds).toHaveBeenCalledWith([
                'reviewer-1',
                'reviewer-2',
            ]);
            expect(
                notificationRecipientDomain.getRecipient
            ).toHaveBeenCalledTimes(2);
            expect(
                notificationRecipientDomain.getRecipient
            ).toHaveBeenNthCalledWith(
                1,
                reviewers[0],
                EnumNotificationKind.workspaceJoinRequest
            );
            expect(
                notificationRecipientDomain.getRecipient
            ).toHaveBeenNthCalledWith(
                2,
                reviewers[1],
                EnumNotificationKind.workspaceJoinRequest
            );
            expect(
                notificationQueue.sendWorkspaceJoinRequest
            ).toHaveBeenCalledTimes(2);
            expect(
                notificationQueue.sendWorkspaceJoinRequest
            ).toHaveBeenNthCalledWith(
                1,
                recipientOne,
                {
                    workspaceId: 'workspace-1',
                    workspaceName: 'Acme',
                    requesterName: 'Jane Doe',
                    joinRequestReviewLink:
                        'https://app.example.com/review/join-request-1',
                },
                'user-2'
            );
            expect(
                notificationQueue.sendWorkspaceJoinRequest
            ).toHaveBeenNthCalledWith(
                2,
                recipientTwo,
                expect.objectContaining({ requesterName: 'Jane Doe' }),
                'user-2'
            );
        });

        it('creates nothing and stages nothing when a reviewer recipient read rejects', async () => {
            workspaceRepository.findActiveById.mockResolvedValue(workspace);
            workspaceMemberRepository.findOneByWorkspaceAndUser.mockResolvedValue(
                null
            );
            workspaceJoinRequestRepository.existsPendingByWorkspaceAndUser.mockResolvedValue(
                false
            );
            workspaceJoinRequestRepository.createPending.mockResolvedValue(
                baseJoinRequest
            );
            workspaceMemberRepository.findReviewersByWorkspace.mockResolvedValue(
                [{ userId: 'reviewer-1' }]
            );
            userDomain.getManyActiveByIds.mockResolvedValue([
                {
                    id: 'reviewer-1',
                    email: 'reviewer1@example.com',
                    username: 'reviewerOne',
                },
            ]);
            const error = new Error('recipient-unavailable');
            notificationRecipientDomain.getRecipient.mockRejectedValueOnce(
                error
            );

            const call = domain.createJoinRequest('user-2', create);

            await expect(call).rejects.toBe(error);
            expect(
                workspaceJoinRequestRepository.createPending
            ).not.toHaveBeenCalled();
            expect(activityLogDomain.stagePrepared).not.toHaveBeenCalled();
            expect(
                notificationQueue.sendWorkspaceJoinRequest
            ).not.toHaveBeenCalled();
        });
    });

    describe('getJoinRequestsList', () => {
        it('validates the join-request feature-flag then delegates to the repository', async () => {
            const pagination: IPaginationQueryCursorParams<Prisma.WorkspaceJoinRequestWhereInput> =
                { limit: 20, orderBy: [] };
            const page: IResponsePaginationReturn<WorkspaceJoinRequest> = {
                type: EnumPaginationType.cursor,
                perPage: 20,
                hasNext: false,
                data: [],
            };
            workspaceJoinRequestRepository.findWithPaginationCursor.mockResolvedValue(
                page
            );

            const result = await domain.getJoinRequestsList(
                'workspace-1',
                pagination
            );

            expect(result).toBe(page);
            expect(
                featureFlagDomain.validateFeatureFlagMetadata
            ).toHaveBeenCalledWith('workspace', 'joinRequestAllowed');
            expect(
                workspaceJoinRequestRepository.findWithPaginationCursor
            ).toHaveBeenCalledWith('workspace-1', pagination, null);
        });

        it('forwards the status filter to the repository', async () => {
            const pagination: IPaginationQueryCursorParams<Prisma.WorkspaceJoinRequestWhereInput> =
                { limit: 20, orderBy: [] };
            const page: IResponsePaginationReturn<WorkspaceJoinRequest> = {
                type: EnumPaginationType.cursor,
                perPage: 20,
                hasNext: false,
                data: [],
            };
            const status = { status: { in: ['pending'] } };
            workspaceJoinRequestRepository.findWithPaginationCursor.mockResolvedValue(
                page
            );

            const result = await domain.getJoinRequestsList(
                'workspace-1',
                pagination,
                status
            );

            expect(result).toBe(page);
            expect(
                workspaceJoinRequestRepository.findWithPaginationCursor
            ).toHaveBeenCalledWith('workspace-1', pagination, status);
        });
    });

    describe('acceptJoinRequest', () => {
        const tx = {} as IDatabaseTransactionClient;

        beforeEach(() => {
            databaseService.withTransaction.mockImplementation(fn => fn(tx));
            helperDateService.create.mockReturnValue(
                new Date('2026-03-01T00:00:00.000Z')
            );
        });

        it('throws WorkspaceJoinRequestNotFoundException when the request does not exist', async () => {
            workspaceJoinRequestRepository.findByIdAndWorkspace.mockResolvedValue(
                null
            );

            await expect(
                domain.acceptJoinRequest(
                    workspace,
                    'reviewer-1',
                    'join-request-1'
                )
            ).rejects.toMatchObject({
                constructor: WorkspaceJoinRequestNotFoundException,
                module: 'workspace',
                statusCode: EnumWorkspaceStatusCodeError.joinRequestNotFound,
                statusCodeKey:
                    EnumWorkspaceStatusCodeError[
                        EnumWorkspaceStatusCodeError.joinRequestNotFound
                    ],
                messagePath: 'workspace.error.joinRequestNotFound',
            });
        });

        it('throws WorkspaceJoinRequestAlreadyProcessedException when the request is no longer pending', async () => {
            workspaceJoinRequestRepository.findByIdAndWorkspace.mockResolvedValue(
                {
                    ...baseJoinRequest,
                    status: EnumWorkspaceJoinRequestStatus.accepted,
                }
            );

            await expect(
                domain.acceptJoinRequest(
                    workspace,
                    'reviewer-1',
                    'join-request-1'
                )
            ).rejects.toMatchObject({
                constructor: WorkspaceJoinRequestAlreadyProcessedException,
                module: 'workspace',
                statusCode:
                    EnumWorkspaceStatusCodeError.joinRequestAlreadyProcessed,
                statusCodeKey:
                    EnumWorkspaceStatusCodeError[
                        EnumWorkspaceStatusCodeError.joinRequestAlreadyProcessed
                    ],
                messagePath: 'workspace.error.joinRequestAlreadyProcessed',
            });
        });

        it('accepts with a single activity log in order when the reviewer is the requester', async () => {
            const joinRequest = { ...baseJoinRequest, userId: 'reviewer-1' };
            workspaceJoinRequestRepository.findByIdAndWorkspace.mockResolvedValue(
                joinRequest
            );
            const stagedActivityLog: IActivityLogStaged = {
                action: EnumActivityLogAction.workspaceJoinAccepted,
                metadata: {},
                onError: false,
                userId: null,
                createdBy: null,
                workspaceId: null,
            };
            activityLogDomain.prepare.mockReturnValue(stagedActivityLog);
            const callOrder: string[] = [];
            workspaceJoinRequestRepository.acceptInTx.mockImplementation(
                async () => {
                    callOrder.push('acceptInTx');
                }
            );
            activityLogDomain.stagePrepared.mockImplementation(() => {
                callOrder.push('stagePrepared');
            });
            notificationQueue.sendWorkspaceJoinAccepted.mockImplementation(
                async () => {
                    callOrder.push('sendWorkspaceJoinAccepted');
                }
            );

            await domain.acceptJoinRequest(
                workspace,
                'reviewer-1',
                'join-request-1'
            );

            expect(activityLogDomain.prepare).toHaveBeenCalledTimes(1);
            expect(workspaceMemberDomain.createInTx).toHaveBeenCalledWith(
                tx,
                'workspace-1',
                'reviewer-1',
                EnumWorkspaceMemberRole.member,
                'reviewer-1'
            );
            expect(
                workspaceJoinRequestRepository.acceptInTx
            ).toHaveBeenCalledWith(
                tx,
                'join-request-1',
                'reviewer-1',
                new Date('2026-03-01T00:00:00.000Z')
            );
            expect(activityLogDomain.stagePrepared).toHaveBeenCalledWith([
                stagedActivityLog,
            ]);
            expect(userDomain.getOneActive).toHaveBeenCalledWith('reviewer-1');
            expect(
                notificationRecipientDomain.getRecipient
            ).toHaveBeenCalledWith(
                requester,
                EnumNotificationKind.workspaceJoinAccepted
            );
            expect(
                notificationQueue.sendWorkspaceJoinAccepted
            ).toHaveBeenCalledWith(
                recipient,
                { workspaceId: 'workspace-1', workspaceName: 'Acme' },
                'reviewer-1'
            );
            expect(callOrder).toEqual([
                'acceptInTx',
                'stagePrepared',
                'sendWorkspaceJoinAccepted',
            ]);
        });

        it('commits nothing and stages nothing when the recipient read rejects', async () => {
            workspaceJoinRequestRepository.findByIdAndWorkspace.mockResolvedValue(
                baseJoinRequest
            );
            const error = new Error('recipient-unavailable');
            notificationRecipientDomain.getRecipient.mockRejectedValueOnce(
                error
            );

            const call = domain.acceptJoinRequest(
                workspace,
                'reviewer-1',
                'join-request-1'
            );

            await expect(call).rejects.toBe(error);
            expect(databaseService.withTransaction).not.toHaveBeenCalled();
            expect(workspaceMemberDomain.createInTx).not.toHaveBeenCalled();
            expect(
                workspaceJoinRequestRepository.acceptInTx
            ).not.toHaveBeenCalled();
            expect(activityLogDomain.stagePrepared).not.toHaveBeenCalled();
            expect(
                notificationQueue.sendWorkspaceJoinAccepted
            ).not.toHaveBeenCalled();
        });

        it('accepts without notifying when the requester is no longer active', async () => {
            workspaceJoinRequestRepository.findByIdAndWorkspace.mockResolvedValue(
                baseJoinRequest
            );
            userDomain.getOneActive.mockResolvedValue(null);

            await domain.acceptJoinRequest(
                workspace,
                'reviewer-1',
                'join-request-1'
            );

            expect(
                workspaceJoinRequestRepository.acceptInTx
            ).toHaveBeenCalledTimes(1);
            expect(
                notificationRecipientDomain.getRecipient
            ).not.toHaveBeenCalled();
            expect(
                notificationQueue.sendWorkspaceJoinAccepted
            ).not.toHaveBeenCalled();
        });

        it('accepts with two activity logs when the reviewer differs from the requester', async () => {
            const joinRequest = { ...baseJoinRequest, userId: 'user-2' };
            workspaceJoinRequestRepository.findByIdAndWorkspace.mockResolvedValue(
                joinRequest
            );
            const acceptedActivityLog: IActivityLogStaged = {
                action: EnumActivityLogAction.workspaceJoinAccepted,
                metadata: {},
                onError: false,
                userId: null,
                createdBy: null,
                workspaceId: null,
            };
            const acceptedByAdminActivityLog: IActivityLogStaged = {
                action: EnumActivityLogAction.workspaceJoinAcceptedByAdmin,
                metadata: {},
                onError: false,
                userId: null,
                createdBy: null,
                workspaceId: null,
            };
            activityLogDomain.prepare
                .mockReturnValueOnce(acceptedActivityLog)
                .mockReturnValueOnce(acceptedByAdminActivityLog);

            await domain.acceptJoinRequest(
                workspace,
                'reviewer-1',
                'join-request-1'
            );

            expect(activityLogDomain.prepare).toHaveBeenCalledTimes(2);
            expect(activityLogDomain.prepare).toHaveBeenNthCalledWith(2, {
                action: EnumActivityLogAction.workspaceJoinAcceptedByAdmin,
                userId: 'user-2',
                createdBy: 'reviewer-1',
                workspaceId: 'workspace-1',
                metadata: { actorUserId: 'reviewer-1' },
            });
            expect(activityLogDomain.stagePrepared).toHaveBeenCalledWith([
                acceptedActivityLog,
                acceptedByAdminActivityLog,
            ]);
        });
    });

    describe('rejectJoinRequest', () => {
        beforeEach(() => {
            helperDateService.create.mockReturnValue(
                new Date('2026-03-01T00:00:00.000Z')
            );
        });

        it('throws WorkspaceJoinRequestNotFoundException when the request does not exist', async () => {
            workspaceJoinRequestRepository.findByIdAndWorkspace.mockResolvedValue(
                null
            );

            await expect(
                domain.rejectJoinRequest(
                    workspace,
                    'reviewer-1',
                    'join-request-1',
                    EnumWorkspaceJoinRejectReason.wrongWorkspace
                )
            ).rejects.toMatchObject({
                constructor: WorkspaceJoinRequestNotFoundException,
                module: 'workspace',
                statusCode: EnumWorkspaceStatusCodeError.joinRequestNotFound,
                statusCodeKey:
                    EnumWorkspaceStatusCodeError[
                        EnumWorkspaceStatusCodeError.joinRequestNotFound
                    ],
                messagePath: 'workspace.error.joinRequestNotFound',
            });
        });

        it('throws WorkspaceJoinRequestAlreadyProcessedException when the request is no longer pending', async () => {
            workspaceJoinRequestRepository.findByIdAndWorkspace.mockResolvedValue(
                {
                    ...baseJoinRequest,
                    status: EnumWorkspaceJoinRequestStatus.rejected,
                }
            );

            await expect(
                domain.rejectJoinRequest(
                    workspace,
                    'reviewer-1',
                    'join-request-1',
                    EnumWorkspaceJoinRejectReason.wrongWorkspace
                )
            ).rejects.toMatchObject({
                constructor: WorkspaceJoinRequestAlreadyProcessedException,
                module: 'workspace',
                statusCode:
                    EnumWorkspaceStatusCodeError.joinRequestAlreadyProcessed,
                statusCodeKey:
                    EnumWorkspaceStatusCodeError[
                        EnumWorkspaceStatusCodeError.joinRequestAlreadyProcessed
                    ],
                messagePath: 'workspace.error.joinRequestAlreadyProcessed',
            });
        });

        it('rejects with a single activity log in order when the reviewer is the requester', async () => {
            const joinRequest = { ...baseJoinRequest, userId: 'reviewer-1' };
            workspaceJoinRequestRepository.findByIdAndWorkspace.mockResolvedValue(
                joinRequest
            );
            const stagedActivityLog: IActivityLogStaged = {
                action: EnumActivityLogAction.workspaceJoinRejected,
                metadata: {},
                onError: false,
                userId: null,
                createdBy: null,
                workspaceId: null,
            };
            activityLogDomain.prepare.mockReturnValue(stagedActivityLog);
            const callOrder: string[] = [];
            workspaceJoinRequestRepository.reject.mockImplementation(
                async () => {
                    callOrder.push('reject');
                }
            );
            activityLogDomain.stagePrepared.mockImplementation(() => {
                callOrder.push('stagePrepared');
            });
            notificationQueue.sendWorkspaceJoinRejected.mockImplementation(
                async () => {
                    callOrder.push('sendWorkspaceJoinRejected');
                }
            );

            await domain.rejectJoinRequest(
                workspace,
                'reviewer-1',
                'join-request-1',
                EnumWorkspaceJoinRejectReason.wrongWorkspace
            );

            expect(activityLogDomain.prepare).toHaveBeenCalledTimes(1);
            expect(workspaceJoinRequestRepository.reject).toHaveBeenCalledWith(
                'join-request-1',
                'reviewer-1',
                EnumWorkspaceJoinRejectReason.wrongWorkspace,
                new Date('2026-03-01T00:00:00.000Z')
            );
            expect(activityLogDomain.stagePrepared).toHaveBeenCalledWith([
                stagedActivityLog,
            ]);
            expect(userDomain.getOneActive).toHaveBeenCalledWith('reviewer-1');
            expect(
                notificationRecipientDomain.getRecipient
            ).toHaveBeenCalledWith(
                requester,
                EnumNotificationKind.workspaceJoinRejected
            );
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
                'reviewer-1'
            );
            expect(callOrder).toEqual([
                'reject',
                'stagePrepared',
                'sendWorkspaceJoinRejected',
            ]);
        });

        it('commits nothing and stages nothing when the recipient read rejects', async () => {
            workspaceJoinRequestRepository.findByIdAndWorkspace.mockResolvedValue(
                baseJoinRequest
            );
            const error = new Error('recipient-unavailable');
            notificationRecipientDomain.getRecipient.mockRejectedValueOnce(
                error
            );

            const call = domain.rejectJoinRequest(
                workspace,
                'reviewer-1',
                'join-request-1',
                EnumWorkspaceJoinRejectReason.wrongWorkspace
            );

            await expect(call).rejects.toBe(error);
            expect(
                workspaceJoinRequestRepository.reject
            ).not.toHaveBeenCalled();
            expect(activityLogDomain.stagePrepared).not.toHaveBeenCalled();
            expect(
                notificationQueue.sendWorkspaceJoinRejected
            ).not.toHaveBeenCalled();
        });

        it('rejects without notifying when the requester is no longer active', async () => {
            workspaceJoinRequestRepository.findByIdAndWorkspace.mockResolvedValue(
                baseJoinRequest
            );
            userDomain.getOneActive.mockResolvedValue(null);

            await domain.rejectJoinRequest(
                workspace,
                'reviewer-1',
                'join-request-1',
                EnumWorkspaceJoinRejectReason.wrongWorkspace
            );

            expect(workspaceJoinRequestRepository.reject).toHaveBeenCalledTimes(
                1
            );
            expect(
                notificationRecipientDomain.getRecipient
            ).not.toHaveBeenCalled();
            expect(
                notificationQueue.sendWorkspaceJoinRejected
            ).not.toHaveBeenCalled();
        });

        it('rejects with two activity logs when the reviewer differs from the requester', async () => {
            const joinRequest = { ...baseJoinRequest, userId: 'user-2' };
            workspaceJoinRequestRepository.findByIdAndWorkspace.mockResolvedValue(
                joinRequest
            );
            const rejectedActivityLog: IActivityLogStaged = {
                action: EnumActivityLogAction.workspaceJoinRejected,
                metadata: {},
                onError: false,
                userId: null,
                createdBy: null,
                workspaceId: null,
            };
            const rejectedByAdminActivityLog: IActivityLogStaged = {
                action: EnumActivityLogAction.workspaceJoinRejectedByAdmin,
                metadata: {},
                onError: false,
                userId: null,
                createdBy: null,
                workspaceId: null,
            };
            activityLogDomain.prepare
                .mockReturnValueOnce(rejectedActivityLog)
                .mockReturnValueOnce(rejectedByAdminActivityLog);

            await domain.rejectJoinRequest(
                workspace,
                'reviewer-1',
                'join-request-1',
                EnumWorkspaceJoinRejectReason.other
            );

            expect(activityLogDomain.prepare).toHaveBeenCalledTimes(2);
            expect(activityLogDomain.prepare).toHaveBeenNthCalledWith(2, {
                action: EnumActivityLogAction.workspaceJoinRejectedByAdmin,
                userId: 'user-2',
                createdBy: 'reviewer-1',
                workspaceId: 'workspace-1',
                metadata: { actorUserId: 'reviewer-1' },
            });
            expect(activityLogDomain.stagePrepared).toHaveBeenCalledWith([
                rejectedActivityLog,
                rejectedByAdminActivityLog,
            ]);
        });
    });

    describe('assertJoinRequestAllowed', () => {
        it('validates the joinRequestAllowed feature-flag metadata', async () => {
            await domain['assertJoinRequestAllowed']();

            expect(
                featureFlagDomain.validateFeatureFlagMetadata
            ).toHaveBeenCalledWith('workspace', 'joinRequestAllowed');
        });
    });

    describe('getReviewerRecipients', () => {
        it('returns one recipient per active reviewer', async () => {
            workspaceMemberRepository.findReviewersByWorkspace.mockResolvedValue(
                [{ userId: 'reviewer-1' }]
            );
            const reviewer = {
                id: 'reviewer-1',
                email: 'reviewer1@example.com',
                username: 'reviewerOne',
            };
            userDomain.getManyActiveByIds.mockResolvedValue([reviewer]);

            const result = await domain['getReviewerRecipients']('workspace-1');

            expect(
                notificationRecipientDomain.getRecipient
            ).toHaveBeenCalledWith(
                reviewer,
                EnumNotificationKind.workspaceJoinRequest
            );
            expect(result).toEqual([recipient]);
        });
    });

    describe('getNotificationTarget', () => {
        beforeEach(() => {
            workspaceMemberRepository.findReviewersByWorkspace.mockResolvedValue(
                []
            );
        });

        it('falls back to the requester username', async () => {
            userDomain.getNameById.mockResolvedValue({
                name: null,
                username: 'jane',
            });

            const result = await domain['getNotificationTarget'](
                'workspace-1',
                'user-2'
            );

            expect(result).toEqual({
                requesterName: 'jane',
                reviewerRecipients: [],
            });
        });

        it('falls back to "A user" when the requester is not found', async () => {
            userDomain.getNameById.mockResolvedValue(null);

            const result = await domain['getNotificationTarget'](
                'workspace-1',
                'user-2'
            );

            expect(result.requesterName).toBe('A user');
        });
    });

    describe('sendJoinRequestNotifications', () => {
        const joinRequest = baseJoinRequest;

        it('notifies every reviewer recipient with the requester name', async () => {
            helperStringService.fillPattern.mockReturnValue(
                'https://app.example.com/review/join-request-1'
            );

            await domain['sendJoinRequestNotifications'](
                workspace,
                joinRequest,
                'user-2',
                { requesterName: 'jane', reviewerRecipients: [recipient] }
            );

            expect(
                notificationQueue.sendWorkspaceJoinRequest
            ).toHaveBeenCalledWith(
                recipient,
                {
                    workspaceId: 'workspace-1',
                    workspaceName: 'Acme',
                    requesterName: 'jane',
                    joinRequestReviewLink:
                        'https://app.example.com/review/join-request-1',
                },
                'user-2'
            );
        });

        it('sends nothing when there are no reviewer recipients', async () => {
            helperStringService.fillPattern.mockReturnValue(
                'https://app.example.com/review/join-request-1'
            );

            await domain['sendJoinRequestNotifications'](
                workspace,
                joinRequest,
                'user-2',
                { requesterName: 'A user', reviewerRecipients: [] }
            );

            expect(
                notificationQueue.sendWorkspaceJoinRequest
            ).not.toHaveBeenCalled();
        });
    });

    describe('validatePendingJoinRequest', () => {
        it('throws WorkspaceJoinRequestNotFoundException when no request matches', async () => {
            workspaceJoinRequestRepository.findByIdAndWorkspace.mockResolvedValue(
                null
            );

            await expect(
                domain['validatePendingJoinRequest'](
                    'join-request-1',
                    'workspace-1'
                )
            ).rejects.toMatchObject({
                constructor: WorkspaceJoinRequestNotFoundException,
                module: 'workspace',
                statusCode: EnumWorkspaceStatusCodeError.joinRequestNotFound,
                statusCodeKey:
                    EnumWorkspaceStatusCodeError[
                        EnumWorkspaceStatusCodeError.joinRequestNotFound
                    ],
                messagePath: 'workspace.error.joinRequestNotFound',
            });
        });

        it('throws WorkspaceJoinRequestAlreadyProcessedException when the request is not pending', async () => {
            workspaceJoinRequestRepository.findByIdAndWorkspace.mockResolvedValue(
                {
                    ...baseJoinRequest,
                    status: EnumWorkspaceJoinRequestStatus.accepted,
                }
            );

            await expect(
                domain['validatePendingJoinRequest'](
                    'join-request-1',
                    'workspace-1'
                )
            ).rejects.toMatchObject({
                constructor: WorkspaceJoinRequestAlreadyProcessedException,
                module: 'workspace',
                statusCode:
                    EnumWorkspaceStatusCodeError.joinRequestAlreadyProcessed,
                statusCodeKey:
                    EnumWorkspaceStatusCodeError[
                        EnumWorkspaceStatusCodeError.joinRequestAlreadyProcessed
                    ],
                messagePath: 'workspace.error.joinRequestAlreadyProcessed',
            });
        });

        it('returns the pending request', async () => {
            const joinRequest = baseJoinRequest;
            workspaceJoinRequestRepository.findByIdAndWorkspace.mockResolvedValue(
                joinRequest
            );

            const result = await domain['validatePendingJoinRequest'](
                'join-request-1',
                'workspace-1'
            );

            expect(result).toBe(joinRequest);
        });
    });
});
