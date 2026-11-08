import { Test } from '@nestjs/testing';
import type { TestingModule } from '@nestjs/testing';
import { mock } from 'vitest-mock-extended';
import type { MockProxy } from 'vitest-mock-extended';
import {
    EnumActivityLogAction,
    EnumWorkspaceJoinRejectReason,
    EnumWorkspaceJoinRequestStatus,
} from '@generated/prisma-client/client';
import type {
    Workspace,
    WorkspaceJoinRequest,
} from '@generated/prisma-client/client';
import { ActivityLogService } from '@modules/activity-log/services/activity-log.service';
import type { IActivityLogStaged } from '@modules/activity-log/interfaces/activity-log.interface';
import { FeatureFlagDisabledException } from '@modules/feature-flag/exceptions/feature-flag.disabled.exception';
import { EnumNotificationKind } from '@modules/notification/enums/notification.enum';
import type { INotificationRecipient } from '@modules/notification/interfaces/notification.interface';
import { NotificationQueue } from '@modules/notification/queues/notification.queue';
import type { WorkspaceJoinRequestRejectRequestDto } from '@modules/workspace/dtos/request/workspace.join-request-reject.request.dto';
import { WorkspaceJoinRequestService } from '@modules/workspace/services/workspace.join-request.service';
import { WorkspaceJoinRequestAlreadyProcessedException } from '@modules/workspace/exceptions/workspace.join-request-already-processed.exception';
import { TestRecipient } from '@test/unit/helpers/test.unit.notification-push.helper';
import { WorkspaceRejectJoinRequestUseCase } from '@modules/workspace/use-cases/workspace.reject-join-request.use-case';

describe('WorkspaceRejectJoinRequestUseCase', () => {
    const workspaceJoinRequestService: MockProxy<WorkspaceJoinRequestService> =
        mock<WorkspaceJoinRequestService>();
    const activityLogService: MockProxy<ActivityLogService> =
        mock<ActivityLogService>();
    const notificationQueue: MockProxy<NotificationQueue> =
        mock<NotificationQueue>();
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
        expiredAt: new Date('2026-01-09T00:00:00.000Z'),
        nonce: 'aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa',
    };
    const recipient: INotificationRecipient = {
        ...TestRecipient,
        userId: 'user-2',
    };
    const stagedActivityLog: IActivityLogStaged = {
        action: EnumActivityLogAction.workspaceJoinRequested,
        metadata: {},
        userId: null,
        createdBy: null,
        workspaceId: null,
    };
    let useCase: WorkspaceRejectJoinRequestUseCase;

    beforeEach(async () => {
        vi.resetAllMocks();
        activityLogService.prepare.mockReturnValue(stagedActivityLog);

        const module: TestingModule = await Test.createTestingModule({
            providers: [
                WorkspaceRejectJoinRequestUseCase,
                {
                    provide: WorkspaceJoinRequestService,
                    useValue: workspaceJoinRequestService,
                },
                { provide: ActivityLogService, useValue: activityLogService },
                { provide: NotificationQueue, useValue: notificationQueue },
            ],
        }).compile();

        useCase = module.get(WorkspaceRejectJoinRequestUseCase);
    });

    describe('execute', () => {
        const body: WorkspaceJoinRequestRejectRequestDto = {
            rejectReasonCode: EnumWorkspaceJoinRejectReason.wrongWorkspace,
        };

        beforeEach(() => {
            workspaceJoinRequestService.getPendingById.mockResolvedValue(
                joinRequest
            );
            workspaceJoinRequestService.getRequesterRecipient.mockResolvedValue(
                recipient
            );
        });

        it('gates, reads the pending request and recipient, rejects, stages the rows, and notifies in order', async () => {
            const callOrder: string[] = [];
            workspaceJoinRequestService.assertJoinRequestAllowed.mockImplementation(
                async () => {
                    callOrder.push('gate');
                }
            );
            workspaceJoinRequestService.getPendingById.mockImplementation(
                async () => {
                    callOrder.push('pending');

                    return joinRequest;
                }
            );
            workspaceJoinRequestService.getRequesterRecipient.mockImplementation(
                async () => {
                    callOrder.push('recipient');

                    return recipient;
                }
            );
            workspaceJoinRequestService.rejectJoinRequest.mockImplementation(
                async () => {
                    callOrder.push('reject');
                }
            );
            activityLogService.stagePrepared.mockImplementation(() => {
                callOrder.push('stage');
            });
            notificationQueue.sendWorkspaceJoinRejected.mockImplementation(
                async () => {
                    callOrder.push('notify');
                }
            );

            const result = await useCase.execute(
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
            expect(
                workspaceJoinRequestService.getRequesterRecipient
            ).toHaveBeenCalledWith(
                'user-2',
                EnumNotificationKind.workspaceJoinRejected
            );
            expect(
                workspaceJoinRequestService.rejectJoinRequest
            ).toHaveBeenCalledWith(
                'join-request-1',
                'reviewer-1',
                EnumWorkspaceJoinRejectReason.wrongWorkspace
            );
            expect(activityLogService.prepare).toHaveBeenNthCalledWith(1, {
                action: EnumActivityLogAction.workspaceJoinRejected,
                userId: 'reviewer-1',
                createdBy: 'reviewer-1',
                workspaceId: 'workspace-1',
                metadata: { targetUserId: 'user-2' },
            });
            expect(activityLogService.prepare).toHaveBeenNthCalledWith(2, {
                action: EnumActivityLogAction.workspaceJoinRejectedByAdmin,
                userId: 'user-2',
                createdBy: 'reviewer-1',
                workspaceId: 'workspace-1',
                metadata: { actorUserId: 'reviewer-1' },
            });
            expect(activityLogService.stagePrepared).toHaveBeenCalledWith([
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
            await useCase.execute(workspace, 'user-2', 'join-request-1', body);

            expect(activityLogService.prepare).toHaveBeenCalledTimes(1);
        });

        it('rejects without notifying when the requester is no longer active', async () => {
            workspaceJoinRequestService.getRequesterRecipient.mockResolvedValue(
                null
            );

            await useCase.execute(
                workspace,
                'reviewer-1',
                'join-request-1',
                body
            );

            expect(
                workspaceJoinRequestService.rejectJoinRequest
            ).toHaveBeenCalled();
            expect(
                notificationQueue.sendWorkspaceJoinRejected
            ).not.toHaveBeenCalled();
        });

        it('runs the join-request gate first and stops when it rejects', async () => {
            workspaceJoinRequestService.assertJoinRequestAllowed.mockRejectedValue(
                new FeatureFlagDisabledException()
            );

            await expect(
                useCase.execute(workspace, 'reviewer-1', 'join-request-1', body)
            ).rejects.toBeInstanceOf(FeatureFlagDisabledException);
            expect(
                workspaceJoinRequestService.getPendingById
            ).not.toHaveBeenCalled();
        });

        it('rejects nothing when the recipient read rejects', async () => {
            const failure = new Error('read-failed');
            workspaceJoinRequestService.getRequesterRecipient.mockRejectedValue(
                failure
            );

            await expect(
                useCase.execute(workspace, 'reviewer-1', 'join-request-1', body)
            ).rejects.toBe(failure);
            expect(
                workspaceJoinRequestService.rejectJoinRequest
            ).not.toHaveBeenCalled();
            expect(activityLogService.stagePrepared).not.toHaveBeenCalled();
        });

        it('stages nothing and notifies nobody when the reject rejects', async () => {
            workspaceJoinRequestService.rejectJoinRequest.mockRejectedValue(
                new WorkspaceJoinRequestAlreadyProcessedException()
            );

            await expect(
                useCase.execute(workspace, 'reviewer-1', 'join-request-1', body)
            ).rejects.toBeInstanceOf(
                WorkspaceJoinRequestAlreadyProcessedException
            );
            expect(activityLogService.stagePrepared).not.toHaveBeenCalled();
            expect(
                notificationQueue.sendWorkspaceJoinRejected
            ).not.toHaveBeenCalled();
        });
    });
});
