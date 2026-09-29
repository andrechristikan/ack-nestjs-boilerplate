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
    EnumWorkspaceJoinRejectReason,
    EnumWorkspaceJoinRequestStatus,
    EnumWorkspaceMemberRole,
} from '@generated/prisma-client/client';
import type {
    Prisma,
    Workspace,
    WorkspaceJoinRequest,
} from '@generated/prisma-client/client';
import type { IActivityLogStagedEvent } from '@modules/activity-log/interfaces/activity-log.interface';
import { ActivityLogDomain } from '@modules/activity-log/domains/activity-log.domain';
import { FeatureFlagDomain } from '@modules/feature-flag/domains/feature-flag.domain';
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

    function buildJoinRequest(
        overrides: Partial<WorkspaceJoinRequest> = {}
    ): WorkspaceJoinRequest {
        return {
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
            ...overrides,
        };
    }

    let domain: WorkspaceJoinRequestDomain;

    beforeEach(async () => {
        vi.resetAllMocks();
        configGet.mockImplementation((key: string) => configValues[key]);

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
            const joinRequest = buildJoinRequest();
            const callOrder: string[] = [];
            workspaceJoinRequestRepository.createPending.mockImplementation(
                async () => {
                    callOrder.push('createPending');
                    return joinRequest;
                }
            );
            const stagedEvent: IActivityLogStagedEvent = {
                action: EnumActivityLogAction.workspaceJoinRequested,
                metadata: {},
                onError: false,
            };
            activityLogDomain.prepare.mockReturnValue(stagedEvent);
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
                stagedEvent,
            ]);
            expect(callOrder).toEqual(['createPending', 'stagePrepared']);
            expect(
                notificationQueue.sendWorkspaceJoinRequest
            ).toHaveBeenCalledTimes(2);
            expect(
                notificationQueue.sendWorkspaceJoinRequest
            ).toHaveBeenNthCalledWith(
                1,
                'reviewer-1',
                {
                    workspaceId: 'workspace-1',
                    workspaceName: 'Acme',
                    requesterName: 'Jane Doe',
                    joinRequestReviewLink:
                        'https://app.example.com/review/join-request-1',
                },
                'user-2'
            );
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
            ).toHaveBeenCalledWith('workspace-1', pagination, undefined);
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
                buildJoinRequest({
                    status: EnumWorkspaceJoinRequestStatus.accepted,
                })
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

        it('accepts with a single event in order when the reviewer is the requester', async () => {
            const joinRequest = buildJoinRequest({ userId: 'reviewer-1' });
            workspaceJoinRequestRepository.findByIdAndWorkspace.mockResolvedValue(
                joinRequest
            );
            const stagedEvent: IActivityLogStagedEvent = {
                action: EnumActivityLogAction.workspaceJoinAccepted,
                metadata: {},
                onError: false,
            };
            activityLogDomain.prepare.mockReturnValue(stagedEvent);
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
                stagedEvent,
            ]);
            expect(
                notificationQueue.sendWorkspaceJoinAccepted
            ).toHaveBeenCalledWith(
                'reviewer-1',
                { workspaceId: 'workspace-1', workspaceName: 'Acme' },
                'reviewer-1'
            );
            expect(callOrder).toEqual([
                'acceptInTx',
                'stagePrepared',
                'sendWorkspaceJoinAccepted',
            ]);
        });

        it('accepts with two events when the reviewer differs from the requester', async () => {
            const joinRequest = buildJoinRequest({ userId: 'user-2' });
            workspaceJoinRequestRepository.findByIdAndWorkspace.mockResolvedValue(
                joinRequest
            );
            const acceptedEvent: IActivityLogStagedEvent = {
                action: EnumActivityLogAction.workspaceJoinAccepted,
                metadata: {},
                onError: false,
            };
            const acceptedByAdminEvent: IActivityLogStagedEvent = {
                action: EnumActivityLogAction.workspaceJoinAcceptedByAdmin,
                metadata: {},
                onError: false,
            };
            activityLogDomain.prepare
                .mockReturnValueOnce(acceptedEvent)
                .mockReturnValueOnce(acceptedByAdminEvent);

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
                acceptedEvent,
                acceptedByAdminEvent,
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
                buildJoinRequest({
                    status: EnumWorkspaceJoinRequestStatus.rejected,
                })
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

        it('rejects with a single event in order when the reviewer is the requester', async () => {
            const joinRequest = buildJoinRequest({ userId: 'reviewer-1' });
            workspaceJoinRequestRepository.findByIdAndWorkspace.mockResolvedValue(
                joinRequest
            );
            const stagedEvent: IActivityLogStagedEvent = {
                action: EnumActivityLogAction.workspaceJoinRejected,
                metadata: {},
                onError: false,
            };
            activityLogDomain.prepare.mockReturnValue(stagedEvent);
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
                stagedEvent,
            ]);
            expect(
                notificationQueue.sendWorkspaceJoinRejected
            ).toHaveBeenCalledWith(
                'reviewer-1',
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

        it('rejects with two events when the reviewer differs from the requester', async () => {
            const joinRequest = buildJoinRequest({ userId: 'user-2' });
            workspaceJoinRequestRepository.findByIdAndWorkspace.mockResolvedValue(
                joinRequest
            );
            const rejectedEvent: IActivityLogStagedEvent = {
                action: EnumActivityLogAction.workspaceJoinRejected,
                metadata: {},
                onError: false,
            };
            const rejectedByAdminEvent: IActivityLogStagedEvent = {
                action: EnumActivityLogAction.workspaceJoinRejectedByAdmin,
                metadata: {},
                onError: false,
            };
            activityLogDomain.prepare
                .mockReturnValueOnce(rejectedEvent)
                .mockReturnValueOnce(rejectedByAdminEvent);

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
                rejectedEvent,
                rejectedByAdminEvent,
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

    describe('sendJoinRequestNotifications', () => {
        const joinRequest = buildJoinRequest();

        it('falls back to the requester username, then "A user", and notifies every reviewer', async () => {
            userDomain.getNameById.mockResolvedValue({
                name: null,
                username: 'jane',
            });
            workspaceMemberRepository.findReviewersByWorkspace.mockResolvedValue(
                [{ userId: 'reviewer-1' }]
            );
            helperStringService.fillPattern.mockReturnValue(
                'https://app.example.com/review/join-request-1'
            );

            await domain['sendJoinRequestNotifications'](
                workspace,
                joinRequest,
                'user-2'
            );

            expect(
                notificationQueue.sendWorkspaceJoinRequest
            ).toHaveBeenCalledWith(
                'reviewer-1',
                expect.objectContaining({ requesterName: 'jane' }),
                'user-2'
            );
        });

        it('falls back to "A user" when the requester has neither a name nor is found', async () => {
            userDomain.getNameById.mockResolvedValue(null);
            workspaceMemberRepository.findReviewersByWorkspace.mockResolvedValue(
                []
            );
            helperStringService.fillPattern.mockReturnValue(
                'https://app.example.com/review/join-request-1'
            );

            await domain['sendJoinRequestNotifications'](
                workspace,
                joinRequest,
                'user-2'
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
                buildJoinRequest({
                    status: EnumWorkspaceJoinRequestStatus.accepted,
                })
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
            const joinRequest = buildJoinRequest();
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
