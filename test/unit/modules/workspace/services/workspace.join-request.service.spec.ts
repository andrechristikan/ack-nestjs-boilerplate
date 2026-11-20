import { buildActivityLogCreateManyEffect } from '@test/unit/helpers/test.unit.activity-log-effect.helper';
import type { INotificationNotifyEffect } from '@modules/notification/interfaces/notification.interface';
import { ConfigService } from '@nestjs/config';
import { Test } from '@nestjs/testing';
import type { TestingModule } from '@nestjs/testing';
import { mock } from 'vitest-mock-extended';
import type { MockProxy } from 'vitest-mock-extended';
import { AppUnknownException } from '@app/exceptions/app.unknown.exception';
import { DatabaseWriteConflictCode } from '@common/database/constants/database.constant';
import type { IDatabaseTransactionClient } from '@common/database/interfaces/database.client.interface';
import { MessageService } from '@common/message/services/message.service';
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
    Workspace,
    WorkspaceJoinRequest,
    WorkspaceMember,
} from '@generated/prisma-client/client';
import { ActivityLogService } from '@modules/activity-log/services/activity-log.service';
import { FeatureFlagService } from '@modules/feature-flag/services/feature-flag.service';
import { FeatureFlagNotConfiguredException } from '@modules/feature-flag/exceptions/feature-flag.not-configured.exception';
import {
    EnumFeatureFlagKey,
    EnumFeatureFlagMetadataKey,
} from '@modules/feature-flag/enums/feature-flag.enum';
import { FeatureFlagDisabledException } from '@modules/feature-flag/exceptions/feature-flag.disabled.exception';
import { NotificationService } from '@modules/notification/services/notification.service';
import {
    EnumNotificationKind,
    EnumNotificationProcess,
    EnumNotificationQueue,
} from '@modules/notification/enums/notification.enum';
import { EnumQueuePriority } from '@common/queue/enums/queue.enum';
import { OutboxService } from '@common/outbox/services/outbox.service';
import { WorkspaceInviteService } from '@modules/workspace/services/workspace.invite.service';
import { WorkspaceJoinRequestService } from '@modules/workspace/services/workspace.join-request.service';
import { WorkspaceMemberService } from '@modules/workspace/services/workspace.member.service';
import { EnumWorkspaceStatusCodeError } from '@modules/workspace/enums/workspace.status-code.enum';
import { WorkspaceJoinRequestAlreadyMemberException } from '@modules/workspace/exceptions/workspace.join-request-already-member.exception';
import { WorkspaceJoinRequestAlreadyProcessedException } from '@modules/workspace/exceptions/workspace.join-request-already-processed.exception';
import { WorkspaceJoinRequestDuplicateException } from '@modules/workspace/exceptions/workspace.join-request-duplicate.exception';
import { WorkspaceJoinRequestNotFoundException } from '@modules/workspace/exceptions/workspace.join-request-not-found.exception';
import { WorkspaceNotFoundException } from '@modules/workspace/exceptions/workspace.not-found.exception';
import { WorkspaceNotPublicException } from '@modules/workspace/exceptions/workspace.not-public.exception';
import type {
    IWorkspaceJoinRequestCreate,
    IWorkspaceJoinRequestNotice,
} from '@modules/workspace/interfaces/workspace.interface';
import { WorkspaceJoinRequestRepository } from '@modules/workspace/repositories/workspace.join-request.repository';
import { WorkspaceMemberRepository } from '@modules/workspace/repositories/workspace.member.repository';
import { WorkspaceRepository } from '@modules/workspace/repositories/workspace.repository';
import {
    buildApiKeyContext,
    buildAuthJwtAccessContext,
    buildRequestContext,
    buildUser,
    buildUserContext,
    buildWorkspace,
    buildWorkspaceMember,
} from '@test/unit/helpers/test.unit.request.helper';
import { buildConfigService } from '@test/unit/helpers/test.unit.config.helper';
import {
    TestUnitKitConfigValues,
    TestUnitKitProviders,
} from '@test/unit/helpers/test.unit.kit.helper';
import { buildPrismaKnownRequestError } from '@test/unit/helpers/test.unit.database.helper';

describe('WorkspaceJoinRequestService', () => {
    const workspaceJoinRequestRepository: MockProxy<WorkspaceJoinRequestRepository> =
        mock<WorkspaceJoinRequestRepository>();
    const workspaceMemberRepository: MockProxy<WorkspaceMemberRepository> =
        mock<WorkspaceMemberRepository>();
    const workspaceRepository: MockProxy<WorkspaceRepository> =
        mock<WorkspaceRepository>();
    const workspaceMemberService: MockProxy<WorkspaceMemberService> =
        mock<WorkspaceMemberService>();
    const workspaceInviteService: MockProxy<WorkspaceInviteService> =
        mock<WorkspaceInviteService>();
    const notificationService: MockProxy<NotificationService> =
        mock<NotificationService>();
    const activityLogService: MockProxy<ActivityLogService> =
        mock<ActivityLogService>();
    const featureFlagService: MockProxy<FeatureFlagService> =
        mock<FeatureFlagService>();
    const outboxService: MockProxy<OutboxService> = mock<OutboxService>();
    const messageService: MockProxy<MessageService> = mock<MessageService>();
    const configValues: Record<string, unknown> = {
        'frontend.baseUrl': 'https://app.example.com',
        'workspace.joinRequest.reviewLinkPattern':
            '{frontendBaseUrl}/workspace/join-requests/{joinRequestId}',
    };
    const pendingNonce =
        '142c7b295b36db200eb70c0cc7d75dbb12543a1f7c1891a243d30f556265a0d1';
    const expiredAt = new Date('2026-01-09T00:00:00.000Z');

    const tx: IDatabaseTransactionClient = mock<IDatabaseTransactionClient>();
    const reviewedAt = new Date('2026-01-02T00:00:00.000Z');

    const workspace: Workspace = {
        ...buildWorkspace(),
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
        expiredAt,
        nonce: pendingNonce,
    };

    const workspaceMember: WorkspaceMember = buildWorkspaceMember('user-2');

    const notifyEffect: INotificationNotifyEffect = {
        queue: EnumNotificationQueue.notification,
        name: EnumNotificationProcess.notify,
        data: {
            kind: EnumNotificationKind.workspaceJoinRequest,
            context: {
                userId: 'reviewer-1',
                proceedBy: 'user-2',
                snapshot: null,
                verificationId: null,
            },
            recipient: null,
            notificationId: null,
        },
        priority: EnumQueuePriority.medium,
        idempotencyKey: 'workspaceJoinRequest-join-request-1-reviewer-1',
    };

    const requestContext = buildRequestContext();
    const apiKeyContext = buildApiKeyContext();
    const userContext = buildUserContext(
        buildUser('reviewer-1', 'jane@example.com')
    );
    const authContext = buildAuthJwtAccessContext(userContext.user.id);
    const authContextOfUser2 = { ...authContext, userId: 'user-2' };
    const firstEntry = buildActivityLogCreateManyEffect('requester-entry');
    const secondEntry = buildActivityLogCreateManyEffect('reviewer-entry');

    let service: WorkspaceJoinRequestService;

    beforeAll(() => {
        vi.useFakeTimers();
    });

    beforeEach(async () => {
        featureFlagService.getMetadataNumber.mockResolvedValue(7);
        vi.setSystemTime(reviewedAt);
        outboxService.withTransaction.mockImplementation(async fn => fn(tx));
        activityLogService.recordEffect
            .mockReturnValueOnce(firstEntry)
            .mockReturnValueOnce(secondEntry);

        const module: TestingModule = await Test.createTestingModule({
            providers: [
                WorkspaceJoinRequestService,
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
                    provide: WorkspaceMemberService,
                    useValue: workspaceMemberService,
                },
                {
                    provide: WorkspaceInviteService,
                    useValue: workspaceInviteService,
                },
                { provide: NotificationService, useValue: notificationService },
                { provide: ActivityLogService, useValue: activityLogService },
                { provide: FeatureFlagService, useValue: featureFlagService },
                ...TestUnitKitProviders,
                { provide: OutboxService, useValue: outboxService },
                { provide: MessageService, useValue: messageService },
                {
                    provide: ConfigService,
                    useValue: buildConfigService({
                        ...TestUnitKitConfigValues,
                        ...configValues,
                    }),
                },
            ],
        }).compile();

        service = module.get(WorkspaceJoinRequestService);
    });

    afterAll(() => {
        vi.useRealTimers();
    });

    describe('assertJoinRequestAllowed', () => {
        it('validates workspace.joinRequestAllowed', async () => {
            await service.assertJoinRequestAllowed();

            expect(
                featureFlagService.validateFeatureFlagMetadata
            ).toHaveBeenCalledWith(
                EnumFeatureFlagKey.workspace,
                EnumFeatureFlagMetadataKey.joinRequestAllowed
            );
        });

        it('propagates the flag exception', async () => {
            featureFlagService.validateFeatureFlagMetadata.mockRejectedValue(
                new FeatureFlagDisabledException()
            );

            await expect(
                service.assertJoinRequestAllowed()
            ).rejects.toBeInstanceOf(FeatureFlagDisabledException);
        });
    });

    describe('getJoinableWorkspace', () => {
        it('throws WorkspaceNotFoundException when the workspace does not exist', async () => {
            workspaceRepository.findActiveByIdWithJoinMembers.mockResolvedValue(
                null
            );

            await expect(
                service.getJoinableWorkspace('user-2', 'workspace-1')
            ).rejects.toMatchObject({
                constructor: WorkspaceNotFoundException,
                module: 'workspace',
                statusCode: EnumWorkspaceStatusCodeError.notFound,
            });
        });

        it('throws WorkspaceNotPublicException when the workspace is not public', async () => {
            workspaceRepository.findActiveByIdWithJoinMembers.mockResolvedValue(
                {
                    ...workspace,
                    isPublic: false,
                    members: [
                        {
                            userId: 'user-2',
                            role: EnumWorkspaceMemberRole.member,
                        },
                    ],
                }
            );

            await expect(
                service.getJoinableWorkspace('user-2', 'workspace-1')
            ).rejects.toMatchObject({
                constructor: WorkspaceNotPublicException,
                module: 'workspace',
                statusCode: EnumWorkspaceStatusCodeError.notPublic,
            });
        });

        it('throws WorkspaceJoinRequestAlreadyMemberException when the caller is among the members', async () => {
            workspaceRepository.findActiveByIdWithJoinMembers.mockResolvedValue(
                {
                    ...workspace,
                    members: [
                        {
                            userId: 'owner-1',
                            role: EnumWorkspaceMemberRole.owner,
                        },
                        {
                            userId: 'user-2',
                            role: EnumWorkspaceMemberRole.member,
                        },
                    ],
                }
            );

            await expect(
                service.getJoinableWorkspace('user-2', 'workspace-1')
            ).rejects.toMatchObject({
                constructor: WorkspaceJoinRequestAlreadyMemberException,
                module: 'workspace',
                statusCode:
                    EnumWorkspaceStatusCodeError.joinRequestAlreadyMember,
            });
        });

        it('answers the workspace with the owner and admin as reviewer ids after one repository call', async () => {
            workspaceRepository.findActiveByIdWithJoinMembers.mockResolvedValue(
                {
                    ...workspace,
                    members: [
                        {
                            userId: 'owner-1',
                            role: EnumWorkspaceMemberRole.owner,
                        },
                        {
                            userId: 'admin-1',
                            role: EnumWorkspaceMemberRole.admin,
                        },
                    ],
                }
            );

            const result = await service.getJoinableWorkspace(
                'user-2',
                'workspace-1'
            );

            expect(result).toEqual({
                workspace,
                reviewerIds: ['owner-1', 'admin-1'],
            });
            expect(
                workspaceRepository.findActiveByIdWithJoinMembers
            ).toHaveBeenCalledTimes(1);
            expect(
                workspaceRepository.findActiveByIdWithJoinMembers
            ).toHaveBeenCalledWith('workspace-1', 'user-2');
        });
    });

    describe('createJoinRequest', () => {
        const create: IWorkspaceJoinRequestCreate = {
            workspaceId: 'workspace-1',
            message: 'Please let me in',
        };
        const notice: IWorkspaceJoinRequestNotice = {
            workspaceName: 'Acme',
            requesterName: 'Requester',
            reviewerIds: ['reviewer-1', 'reviewer-2'],
        };

        it('creates the pending join request with the hashed nonce and an expiry of joinRequestExpiresInDays', async () => {
            workspaceJoinRequestRepository.createPendingInTx.mockResolvedValue(
                baseJoinRequest
            );

            const result = await service.createJoinRequest(
                requestContext,
                apiKeyContext,
                authContextOfUser2,
                create,
                notice
            );

            expect(result).toBe(baseJoinRequest);
            expect(
                workspaceJoinRequestRepository.createPendingInTx
            ).toHaveBeenCalledWith(tx, {
                workspaceId: 'workspace-1',
                userId: 'user-2',
                message: 'Please let me in',
                expiredAt,
                nonce: pendingNonce,
            });
            expect(featureFlagService.getMetadataNumber).toHaveBeenCalledWith(
                EnumFeatureFlagKey.workspace,
                EnumFeatureFlagMetadataKey.joinRequestExpiresInDays
            );
        });

        it('propagates FeatureFlagNotConfiguredException from the read and opens no transaction', async () => {
            const notConfigured = new FeatureFlagNotConfiguredException(
                EnumFeatureFlagKey.workspace,
                EnumFeatureFlagMetadataKey.joinRequestExpiresInDays
            );
            featureFlagService.getMetadataNumber.mockRejectedValue(
                notConfigured
            );

            await expect(
                service.createJoinRequest(
                    requestContext,
                    apiKeyContext,
                    authContextOfUser2,
                    create,
                    notice
                )
            ).rejects.toBe(notConfigured);
            expect(outboxService.withTransaction).not.toHaveBeenCalled();
            expect(
                workspaceJoinRequestRepository.createPendingInTx
            ).not.toHaveBeenCalled();
        });

        it('adds one notify effect per reviewer on the tx of the write and reads no recipient', async () => {
            const effects: INotificationNotifyEffect[] = [
                { ...notifyEffect, idempotencyKey: 'key-1' },
                { ...notifyEffect, idempotencyKey: 'key-2' },
            ];
            workspaceJoinRequestRepository.createPendingInTx.mockResolvedValue(
                baseJoinRequest
            );
            notificationService.notify
                .mockReturnValueOnce(effects[0]!)
                .mockReturnValueOnce(effects[1]!);

            await service.createJoinRequest(
                requestContext,
                apiKeyContext,
                authContextOfUser2,
                create,
                notice
            );

            expect(outboxService.withTransaction).toHaveBeenCalledTimes(1);
            expect(notificationService.notify).toHaveBeenNthCalledWith(
                1,
                EnumNotificationKind.workspaceJoinRequest,
                {
                    userId: 'reviewer-1',
                    proceedBy: 'user-2',
                    workspaceId: 'workspace-1',
                    workspaceName: 'Acme',
                    requesterName: 'Requester',
                    joinRequestId: 'join-request-1',
                    joinRequestReviewLink:
                        'https://app.example.com/workspace/join-requests/join-request-1',
                }
            );
            expect(notificationService.notify).toHaveBeenNthCalledWith(
                2,
                EnumNotificationKind.workspaceJoinRequest,
                expect.objectContaining({ userId: 'reviewer-2' })
            );
            expect(outboxService.addManyInTx).toHaveBeenCalledWith(tx, effects);
        });

        it('adds the requester entry on the tx of the write', async () => {
            workspaceJoinRequestRepository.createPendingInTx.mockResolvedValue(
                baseJoinRequest
            );

            await service.createJoinRequest(
                requestContext,
                apiKeyContext,
                authContextOfUser2,
                create,
                notice
            );

            expect(activityLogService.recordEffect).toHaveBeenCalledWith(
                requestContext,
                apiKeyContext,
                authContextOfUser2,
                null,
                {
                    action: EnumActivityLogAction.workspaceJoinRequested,
                    userId: 'user-2',
                    createdBy: 'user-2',
                    workspaceId: 'workspace-1',
                }
            );
            expect(outboxService.addInTx).toHaveBeenCalledWith(tx, firstEntry);
        });

        it('throws WorkspaceJoinRequestDuplicateException when the nonce collides', async () => {
            const collision = buildPrismaKnownRequestError('P2002', 'nonce');
            workspaceJoinRequestRepository.createPendingInTx.mockRejectedValue(
                collision
            );

            await expect(
                service.createJoinRequest(
                    requestContext,
                    apiKeyContext,
                    authContextOfUser2,
                    create,
                    notice
                )
            ).rejects.toMatchObject({
                constructor: WorkspaceJoinRequestDuplicateException,
                module: 'workspace',
                statusCode: EnumWorkspaceStatusCodeError.joinRequestDuplicate,
            });
            expect(outboxService.addManyInTx).not.toHaveBeenCalled();
        });

        it('throws WorkspaceJoinRequestDuplicateException on a write conflict', async () => {
            const conflict = buildPrismaKnownRequestError(
                DatabaseWriteConflictCode
            );
            workspaceJoinRequestRepository.createPendingInTx.mockRejectedValue(
                conflict
            );

            await expect(
                service.createJoinRequest(
                    requestContext,
                    apiKeyContext,
                    authContextOfUser2,
                    create,
                    notice
                )
            ).rejects.toMatchObject({
                module: 'workspace',

                constructor: WorkspaceJoinRequestDuplicateException,
                statusCode: EnumWorkspaceStatusCodeError.joinRequestDuplicate,
            });
        });

        it('rethrows an AppBaseException thrown inside the transaction as is', async () => {
            const thrown = new WorkspaceJoinRequestAlreadyMemberException();
            workspaceJoinRequestRepository.createPendingInTx.mockRejectedValue(
                thrown
            );

            await expect(
                service.createJoinRequest(
                    requestContext,
                    apiKeyContext,
                    authContextOfUser2,
                    create,
                    notice
                )
            ).rejects.toBe(thrown);
        });

        it('wraps another create failure in AppUnknownException', async () => {
            const cause = new Error('db-down');
            workspaceJoinRequestRepository.createPendingInTx.mockRejectedValue(
                cause
            );

            await expect(
                service.createJoinRequest(
                    requestContext,
                    apiKeyContext,
                    authContextOfUser2,
                    create,
                    notice
                )
            ).rejects.toMatchObject({
                constructor: AppUnknownException,
                rawError: cause,
            });
        });
    });

    describe('getJoinRequestsList', () => {
        const pagination: IPaginationQueryCursorParams = {
            fingerprint: 'aaaaaaaaaaaaaaaa',
            limit: 20,
            orderBy: [],
        };
        const page: IResponsePaginationReturn<WorkspaceJoinRequest> = {
            type: EnumPaginationType.cursor,
            perPage: 20,
            hasNext: false,
            data: [],
        };

        it('delegates to the repository with a null status filter', async () => {
            workspaceJoinRequestRepository.findWithPaginationCursor.mockResolvedValue(
                page
            );

            const result = await service.getJoinRequestsList(
                'workspace-1',
                pagination
            );

            expect(result).toBe(page);
            expect(
                workspaceJoinRequestRepository.findWithPaginationCursor
            ).toHaveBeenCalledWith('workspace-1', pagination, null);
        });

        it('forwards the status filter to the repository', async () => {
            const status = { status: { in: ['pending'] } };
            workspaceJoinRequestRepository.findWithPaginationCursor.mockResolvedValue(
                page
            );

            const result = await service.getJoinRequestsList(
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

    describe('getPendingById', () => {
        it('throws WorkspaceJoinRequestNotFoundException when no request matches', async () => {
            workspaceJoinRequestRepository.findByIdAndWorkspace.mockResolvedValue(
                null
            );

            await expect(
                service.getPendingById('join-request-1', 'workspace-1')
            ).rejects.toMatchObject({
                constructor: WorkspaceJoinRequestNotFoundException,
                module: 'workspace',
                statusCode: EnumWorkspaceStatusCodeError.joinRequestNotFound,
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
                service.getPendingById('join-request-1', 'workspace-1')
            ).rejects.toMatchObject({
                constructor: WorkspaceJoinRequestAlreadyProcessedException,
                module: 'workspace',
                statusCode:
                    EnumWorkspaceStatusCodeError.joinRequestAlreadyProcessed,
            });
        });

        it('returns the pending request', async () => {
            workspaceJoinRequestRepository.findByIdAndWorkspace.mockResolvedValue(
                baseJoinRequest
            );

            const result = await service.getPendingById(
                'join-request-1',
                'workspace-1'
            );

            expect(result).toBe(baseJoinRequest);
            expect(
                workspaceJoinRequestRepository.findByIdAndWorkspace
            ).toHaveBeenCalledWith('join-request-1', 'workspace-1');
        });
    });

    describe('acceptJoinRequest', () => {
        const joinRequestWithEmail = {
            ...baseJoinRequest,
            user: { email: 'user-2@example.com' },
        };

        beforeEach(() => {
            workspaceJoinRequestRepository.findByIdAndWorkspaceInTx.mockResolvedValue(
                joinRequestWithEmail
            );
        });

        it('accepts the request, creates the member, and adds the notify effect on one transaction', async () => {
            const calls: string[] = [];
            workspaceJoinRequestRepository.findByIdAndWorkspaceInTx.mockImplementation(
                async () => {
                    calls.push('read');

                    return joinRequestWithEmail;
                }
            );
            const effect: INotificationNotifyEffect = {
                ...notifyEffect,
                idempotencyKey: 'workspaceJoinAccepted-join-request-1-user-2',
            };
            workspaceJoinRequestRepository.acceptInTx.mockImplementation(
                async () => {
                    calls.push('accept');

                    return true;
                }
            );
            workspaceMemberService.createInTx.mockImplementation(async () => {
                calls.push('createMember');

                return workspaceMember;
            });
            workspaceInviteService.revokePendingByEmailInTx.mockImplementation(
                async () => {
                    calls.push('revokeInvite');
                }
            );
            notificationService.notify.mockReturnValue(effect);
            outboxService.addInTx.mockImplementation(async () => {
                calls.push('addEffect');

                return 'outbox-1';
            });

            await service.acceptJoinRequest(
                requestContext,
                apiKeyContext,
                authContext,
                'join-request-1',
                'workspace-1',
                'Acme'
            );

            expect(calls).toEqual([
                'read',
                'accept',
                'createMember',
                'revokeInvite',
                'addEffect',
            ]);
            expect(outboxService.withTransaction).toHaveBeenCalledTimes(1);
            expect(
                workspaceJoinRequestRepository.acceptInTx
            ).toHaveBeenCalledWith(
                tx,
                'join-request-1',
                'reviewer-1',
                reviewedAt
            );
            expect(workspaceMemberService.createInTx).toHaveBeenCalledWith(
                tx,
                'workspace-1',
                'user-2',
                EnumWorkspaceMemberRole.member,
                'reviewer-1'
            );
            expect(
                workspaceJoinRequestRepository.findByIdAndWorkspaceInTx
            ).toHaveBeenCalledWith(tx, 'join-request-1', 'workspace-1');
            expect(
                workspaceInviteService.revokePendingByEmailInTx
            ).toHaveBeenCalledWith(tx, 'workspace-1', 'user-2@example.com');
            expect(notificationService.notify).toHaveBeenCalledWith(
                EnumNotificationKind.workspaceJoinAccepted,
                {
                    userId: 'user-2',
                    proceedBy: 'reviewer-1',
                    workspaceId: 'workspace-1',
                    workspaceName: 'Acme',
                    joinRequestId: 'join-request-1',
                }
            );
            expect(outboxService.addInTx).toHaveBeenCalledWith(tx, effect);
        });

        it('throws WorkspaceJoinRequestNotFoundException before acceptInTx when the read answers null', async () => {
            workspaceJoinRequestRepository.findByIdAndWorkspaceInTx.mockResolvedValue(
                null
            );

            await expect(
                service.acceptJoinRequest(
                    requestContext,
                    apiKeyContext,
                    authContext,
                    'join-request-1',
                    'workspace-1',
                    'Acme'
                )
            ).rejects.toMatchObject({
                constructor: WorkspaceJoinRequestNotFoundException,
                module: 'workspace',
                statusCode: EnumWorkspaceStatusCodeError.joinRequestNotFound,
            });
            expect(
                workspaceJoinRequestRepository.acceptInTx
            ).not.toHaveBeenCalled();
        });

        it('throws WorkspaceJoinRequestAlreadyProcessedException before acceptInTx when the request is not pending', async () => {
            workspaceJoinRequestRepository.findByIdAndWorkspaceInTx.mockResolvedValue(
                {
                    ...joinRequestWithEmail,
                    status: EnumWorkspaceJoinRequestStatus.accepted,
                }
            );

            await expect(
                service.acceptJoinRequest(
                    requestContext,
                    apiKeyContext,
                    authContext,
                    'join-request-1',
                    'workspace-1',
                    'Acme'
                )
            ).rejects.toMatchObject({
                constructor: WorkspaceJoinRequestAlreadyProcessedException,
                module: 'workspace',
                statusCode:
                    EnumWorkspaceStatusCodeError.joinRequestAlreadyProcessed,
            });
            expect(
                workspaceJoinRequestRepository.acceptInTx
            ).not.toHaveBeenCalled();
        });

        it('adds the reviewer entry and the requester entry on the review tx', async () => {
            workspaceJoinRequestRepository.acceptInTx.mockResolvedValue(true);

            await service.acceptJoinRequest(
                requestContext,
                apiKeyContext,
                authContext,
                'join-request-1',
                'workspace-1',
                'Acme'
            );

            expect(activityLogService.recordEffect).toHaveBeenNthCalledWith(
                1,
                requestContext,
                apiKeyContext,
                authContext,
                null,
                {
                    action: EnumActivityLogAction.workspaceJoinAccepted,
                    userId: 'reviewer-1',
                    createdBy: 'reviewer-1',
                    workspaceId: 'workspace-1',
                    metadata: { targetUserId: 'user-2' },
                }
            );
            expect(activityLogService.recordEffect).toHaveBeenNthCalledWith(
                2,
                requestContext,
                apiKeyContext,
                authContext,
                null,
                {
                    action: EnumActivityLogAction.workspaceJoinAcceptedByAdmin,
                    userId: 'user-2',
                    createdBy: 'reviewer-1',
                    workspaceId: 'workspace-1',
                    metadata: { actorUserId: 'reviewer-1' },
                }
            );
            expect(outboxService.addManyInTx).toHaveBeenCalledWith(tx, [
                firstEntry,
                secondEntry,
            ]);
        });

        it('adds only the reviewer entry when the reviewer is the requester', async () => {
            workspaceJoinRequestRepository.acceptInTx.mockResolvedValue(true);
            workspaceJoinRequestRepository.findByIdAndWorkspaceInTx.mockResolvedValue(
                { ...joinRequestWithEmail, userId: 'reviewer-1' }
            );

            await service.acceptJoinRequest(
                requestContext,
                apiKeyContext,
                authContext,
                'join-request-1',
                'workspace-1',
                'Acme'
            );

            expect(activityLogService.recordEffect).toHaveBeenCalledTimes(1);
            expect(outboxService.addManyInTx).toHaveBeenCalledWith(tx, [
                firstEntry,
            ]);
        });

        it('throws WorkspaceJoinRequestAlreadyProcessedException before the member insert when the guarded accept matches no pending request', async () => {
            workspaceJoinRequestRepository.acceptInTx.mockResolvedValue(false);

            await expect(
                service.acceptJoinRequest(
                    requestContext,
                    apiKeyContext,
                    authContext,
                    'join-request-1',
                    'workspace-1',
                    'Acme'
                )
            ).rejects.toMatchObject({
                constructor: WorkspaceJoinRequestAlreadyProcessedException,
                module: 'workspace',
                statusCode:
                    EnumWorkspaceStatusCodeError.joinRequestAlreadyProcessed,
            });
            expect(workspaceMemberService.createInTx).not.toHaveBeenCalled();
            expect(outboxService.addInTx).not.toHaveBeenCalled();
        });

        it('maps a write conflict in the transaction to WorkspaceJoinRequestAlreadyProcessedException', async () => {
            const conflict = buildPrismaKnownRequestError(
                DatabaseWriteConflictCode
            );
            workspaceJoinRequestRepository.acceptInTx.mockRejectedValue(
                conflict
            );

            await expect(
                service.acceptJoinRequest(
                    requestContext,
                    apiKeyContext,
                    authContext,
                    'join-request-1',
                    'workspace-1',
                    'Acme'
                )
            ).rejects.toMatchObject({
                module: 'workspace',
                statusCode:
                    EnumWorkspaceStatusCodeError.joinRequestAlreadyProcessed,

                constructor: WorkspaceJoinRequestAlreadyProcessedException,
            });
        });

        it('maps a unique collision on the member insert to WorkspaceJoinRequestAlreadyMemberException', async () => {
            workspaceJoinRequestRepository.acceptInTx.mockResolvedValue(true);
            const collision = buildPrismaKnownRequestError('P2002', 'userId');
            workspaceMemberService.createInTx.mockRejectedValue(collision);

            await expect(
                service.acceptJoinRequest(
                    requestContext,
                    apiKeyContext,
                    authContext,
                    'join-request-1',
                    'workspace-1',
                    'Acme'
                )
            ).rejects.toMatchObject({
                constructor: WorkspaceJoinRequestAlreadyMemberException,
                module: 'workspace',
                statusCode:
                    EnumWorkspaceStatusCodeError.joinRequestAlreadyMember,
            });
            expect(outboxService.addInTx).not.toHaveBeenCalled();
        });

        it('wraps any other transaction error in AppUnknownException', async () => {
            workspaceJoinRequestRepository.acceptInTx.mockRejectedValue(
                new Error('boom')
            );

            await expect(
                service.acceptJoinRequest(
                    requestContext,
                    apiKeyContext,
                    authContext,
                    'join-request-1',
                    'workspace-1',
                    'Acme'
                )
            ).rejects.toBeInstanceOf(AppUnknownException);
        });
    });

    describe('rejectJoinRequest', () => {
        it('rejects the request and adds the notify effect with the reason label on one transaction', async () => {
            const calls: string[] = [];
            const effect: INotificationNotifyEffect = {
                ...notifyEffect,
                idempotencyKey: 'workspaceJoinRejected-join-request-1-user-2',
            };
            workspaceJoinRequestRepository.rejectInTx.mockImplementation(
                async () => {
                    calls.push('reject');

                    return true;
                }
            );
            messageService.setMessage.mockReturnValue('Not a good fit');
            notificationService.notify.mockReturnValue(effect);
            outboxService.addInTx.mockImplementation(async () => {
                calls.push('addEffect');

                return 'outbox-1';
            });

            await service.rejectJoinRequest(
                requestContext,
                apiKeyContext,
                authContext,
                baseJoinRequest,
                'Acme',
                EnumWorkspaceJoinRejectReason.wrongWorkspace
            );

            expect(calls).toEqual(['reject', 'addEffect']);
            expect(outboxService.withTransaction).toHaveBeenCalledTimes(1);
            expect(
                workspaceJoinRequestRepository.rejectInTx
            ).toHaveBeenCalledWith(
                tx,
                'join-request-1',
                'reviewer-1',
                EnumWorkspaceJoinRejectReason.wrongWorkspace,
                reviewedAt
            );
            expect(messageService.setMessage).toHaveBeenCalledWith(
                'notification.rejectReason.wrongWorkspace'
            );
            expect(notificationService.notify).toHaveBeenCalledWith(
                EnumNotificationKind.workspaceJoinRejected,
                {
                    userId: 'user-2',
                    proceedBy: 'reviewer-1',
                    workspaceId: 'workspace-1',
                    workspaceName: 'Acme',
                    joinRequestId: 'join-request-1',
                    rejectReasonCode:
                        EnumWorkspaceJoinRejectReason.wrongWorkspace,
                    rejectReasonLabel: 'Not a good fit',
                }
            );
            expect(outboxService.addInTx).toHaveBeenCalledWith(tx, effect);
        });

        it('adds the reviewer entry and the requester entry on the review tx', async () => {
            workspaceJoinRequestRepository.rejectInTx.mockResolvedValue(true);

            await service.rejectJoinRequest(
                requestContext,
                apiKeyContext,
                authContext,
                baseJoinRequest,
                'Acme',
                EnumWorkspaceJoinRejectReason.wrongWorkspace
            );

            expect(activityLogService.recordEffect).toHaveBeenNthCalledWith(
                1,
                requestContext,
                apiKeyContext,
                authContext,
                null,
                {
                    action: EnumActivityLogAction.workspaceJoinRejected,
                    userId: 'reviewer-1',
                    createdBy: 'reviewer-1',
                    workspaceId: 'workspace-1',
                    metadata: { targetUserId: 'user-2' },
                }
            );
            expect(activityLogService.recordEffect).toHaveBeenNthCalledWith(
                2,
                requestContext,
                apiKeyContext,
                authContext,
                null,
                {
                    action: EnumActivityLogAction.workspaceJoinRejectedByAdmin,
                    userId: 'user-2',
                    createdBy: 'reviewer-1',
                    workspaceId: 'workspace-1',
                    metadata: { actorUserId: 'reviewer-1' },
                }
            );
            expect(outboxService.addManyInTx).toHaveBeenCalledWith(tx, [
                firstEntry,
                secondEntry,
            ]);
        });

        it('adds only the reviewer entry when the reviewer is the requester', async () => {
            workspaceJoinRequestRepository.rejectInTx.mockResolvedValue(true);

            await service.rejectJoinRequest(
                requestContext,
                apiKeyContext,
                authContext,
                { ...baseJoinRequest, userId: 'reviewer-1' },
                'Acme',
                EnumWorkspaceJoinRejectReason.wrongWorkspace
            );

            expect(activityLogService.recordEffect).toHaveBeenCalledTimes(1);
            expect(outboxService.addManyInTx).toHaveBeenCalledWith(tx, [
                firstEntry,
            ]);
        });

        it('throws WorkspaceJoinRequestAlreadyProcessedException and adds no effect when the guarded reject matches no pending request', async () => {
            workspaceJoinRequestRepository.rejectInTx.mockResolvedValue(false);

            await expect(
                service.rejectJoinRequest(
                    requestContext,
                    apiKeyContext,
                    authContext,
                    baseJoinRequest,
                    'Acme',
                    EnumWorkspaceJoinRejectReason.wrongWorkspace
                )
            ).rejects.toMatchObject({
                constructor: WorkspaceJoinRequestAlreadyProcessedException,
                module: 'workspace',
                statusCode:
                    EnumWorkspaceStatusCodeError.joinRequestAlreadyProcessed,
            });
            expect(outboxService.addInTx).not.toHaveBeenCalled();
        });

        it('maps a write conflict in the transaction to WorkspaceJoinRequestAlreadyProcessedException', async () => {
            const conflict = buildPrismaKnownRequestError(
                DatabaseWriteConflictCode
            );
            workspaceJoinRequestRepository.rejectInTx.mockRejectedValue(
                conflict
            );

            await expect(
                service.rejectJoinRequest(
                    requestContext,
                    apiKeyContext,
                    authContext,
                    baseJoinRequest,
                    'Acme',
                    EnumWorkspaceJoinRejectReason.wrongWorkspace
                )
            ).rejects.toMatchObject({
                module: 'workspace',
                statusCode:
                    EnumWorkspaceStatusCodeError.joinRequestAlreadyProcessed,

                constructor: WorkspaceJoinRequestAlreadyProcessedException,
            });
        });

        it('wraps any other transaction error in AppUnknownException', async () => {
            const cause = new Error('boom');
            workspaceJoinRequestRepository.rejectInTx.mockRejectedValue(cause);

            await expect(
                service.rejectJoinRequest(
                    requestContext,
                    apiKeyContext,
                    authContext,
                    baseJoinRequest,
                    'Acme',
                    EnumWorkspaceJoinRejectReason.wrongWorkspace
                )
            ).rejects.toMatchObject({
                constructor: AppUnknownException,
                rawError: cause,
            });
        });
    });

    describe('expireStalePending', () => {
        it('returns the count the repository sweep expired', async () => {
            workspaceJoinRequestRepository.expireStalePending.mockResolvedValue(
                3
            );

            const result = await service.expireStalePending();

            expect(result).toBe(3);
            expect(
                workspaceJoinRequestRepository.expireStalePending
            ).toHaveBeenCalledWith();
        });
    });

    describe('cancelPendingByWorkspaceInTx', () => {
        it('cancels the pending requests of the workspace on the given transaction', async () => {
            await service.cancelPendingByWorkspaceInTx(tx, 'workspace-1');

            expect(
                workspaceJoinRequestRepository.cancelPendingByWorkspaceInTx
            ).toHaveBeenCalledWith(tx, 'workspace-1');
        });
    });

    describe('cancelPendingByUserInTx', () => {
        it('cancels the pending request of the user in the workspace on the given transaction and returns the count', async () => {
            workspaceJoinRequestRepository.cancelPendingByUserInTx.mockResolvedValue(
                1
            );

            const result = await service.cancelPendingByUserInTx(
                tx,
                'workspace-1',
                'user-1'
            );

            expect(result).toBe(1);
            expect(
                workspaceJoinRequestRepository.cancelPendingByUserInTx
            ).toHaveBeenCalledWith(tx, 'workspace-1', 'user-1');
        });
    });

    describe('cancelPendingByRequesterInTx', () => {
        it('cancels every pending request of the requester on the given transaction', async () => {
            await service.cancelPendingByRequesterInTx(tx, 'user-1');

            expect(
                workspaceJoinRequestRepository.cancelPendingByRequesterInTx
            ).toHaveBeenCalledWith(tx, 'user-1');
        });
    });

    describe('buildJoinRequestReviewLink', () => {
        it('fills the review link pattern with the home url and join request id', () => {
            const result = service['buildJoinRequestReviewLink']('join-1');

            expect(result).toBe(
                'https://app.example.com/workspace/join-requests/join-1'
            );
        });
    });
});
