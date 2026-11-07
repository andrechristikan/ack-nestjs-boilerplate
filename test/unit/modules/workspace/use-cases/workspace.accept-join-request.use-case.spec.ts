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
    EnumWorkspaceJoinRequestStatus,
} from '@generated/prisma-client/client';
import type {
    User,
    Workspace,
    WorkspaceJoinRequest,
} from '@generated/prisma-client/client';
import { ActivityLogService } from '@modules/activity-log/services/activity-log.service';
import type { IActivityLogStaged } from '@modules/activity-log/interfaces/activity-log.interface';
import { FeatureFlagService } from '@modules/feature-flag/services/feature-flag.service';
import {
    EnumFeatureFlagKey,
    EnumFeatureFlagMetadataKey,
} from '@modules/feature-flag/enums/feature-flag.enum';
import { FeatureFlagDisabledException } from '@modules/feature-flag/exceptions/feature-flag.disabled.exception';
import { NotificationService } from '@modules/notification/services/notification.service';
import { EnumNotificationKind } from '@modules/notification/enums/notification.enum';
import type { INotificationRecipient } from '@modules/notification/interfaces/notification.interface';
import { NotificationQueue } from '@modules/notification/queues/notification.queue';
import { UserService } from '@modules/user/services/user.service';
import { WorkspaceJoinRequestService } from '@modules/workspace/services/workspace.join-request.service';
import { WorkspaceJoinRequestAlreadyProcessedException } from '@modules/workspace/exceptions/workspace.join-request-already-processed.exception';
import { WorkspaceJoinRequestNotFoundException } from '@modules/workspace/exceptions/workspace.join-request-not-found.exception';
import { TestRecipient } from '@test/unit/helpers/test.unit.notification-push.helper';
import { WorkspaceAcceptJoinRequestUseCase } from '@modules/workspace/use-cases/workspace.accept-join-request.use-case';

describe('WorkspaceAcceptJoinRequestUseCase', () => {
    const workspaceJoinRequestService: MockProxy<WorkspaceJoinRequestService> =
        mock<WorkspaceJoinRequestService>();
    const userService: MockProxy<UserService> = mock<UserService>();
    const notificationService: MockProxy<NotificationService> =
        mock<NotificationService>();
    const featureFlagService: MockProxy<FeatureFlagService> =
        mock<FeatureFlagService>();
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
    let useCase: WorkspaceAcceptJoinRequestUseCase;

    beforeEach(async () => {
        vi.resetAllMocks();
        activityLogService.prepare.mockReturnValue(stagedActivityLog);

        const module: TestingModule = await Test.createTestingModule({
            providers: [
                WorkspaceAcceptJoinRequestUseCase,
                {
                    provide: WorkspaceJoinRequestService,
                    useValue: workspaceJoinRequestService,
                },
                { provide: UserService, useValue: userService },
                { provide: NotificationService, useValue: notificationService },
                { provide: FeatureFlagService, useValue: featureFlagService },
                { provide: ActivityLogService, useValue: activityLogService },
                { provide: NotificationQueue, useValue: notificationQueue },
            ],
        }).compile();

        useCase = module.get(WorkspaceAcceptJoinRequestUseCase);
    });

    describe('execute', () => {
        beforeEach(() => {
            workspaceJoinRequestService.getPendingById.mockResolvedValue(
                joinRequest
            );
            userService.getOneActive.mockResolvedValue(requester);
            notificationService.getRecipient.mockResolvedValue(recipient);
        });

        it('gates, reads the pending request and recipient, accepts, stages the rows, and notifies in order', async () => {
            const callOrder: string[] = [];
            featureFlagService.validateFeatureFlagMetadata.mockImplementation(
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
            userService.getOneActive.mockImplementation(async () => {
                callOrder.push('requester');

                return requester;
            });
            notificationService.getRecipient.mockImplementation(async () => {
                callOrder.push('recipient');

                return recipient;
            });
            workspaceJoinRequestService.acceptJoinRequest.mockImplementation(
                async () => {
                    callOrder.push('accept');
                }
            );
            activityLogService.stagePrepared.mockImplementation(() => {
                callOrder.push('stage');
            });
            notificationQueue.sendWorkspaceJoinAccepted.mockImplementation(
                async () => {
                    callOrder.push('notify');
                }
            );

            const result = await useCase.execute(
                workspace,
                'reviewer-1',
                'join-request-1'
            );

            expect(result).toEqual({});
            expect(callOrder).toEqual([
                'gate',
                'pending',
                'requester',
                'recipient',
                'accept',
                'stage',
                'notify',
            ]);
            expect(
                featureFlagService.validateFeatureFlagMetadata
            ).toHaveBeenCalledWith(
                EnumFeatureFlagKey.workspace,
                EnumFeatureFlagMetadataKey.joinRequestAllowed
            );
            expect(
                workspaceJoinRequestService.getPendingById
            ).toHaveBeenCalledWith('join-request-1', 'workspace-1');
            expect(userService.getOneActive).toHaveBeenCalledWith('user-2');
            expect(notificationService.getRecipient).toHaveBeenCalledWith(
                requester,
                EnumNotificationKind.workspaceJoinAccepted
            );
            expect(
                workspaceJoinRequestService.acceptJoinRequest
            ).toHaveBeenCalledWith(joinRequest, 'reviewer-1');
            expect(activityLogService.prepare).toHaveBeenCalledTimes(2);
            expect(activityLogService.prepare).toHaveBeenNthCalledWith(1, {
                action: EnumActivityLogAction.workspaceJoinAccepted,
                userId: 'reviewer-1',
                createdBy: 'reviewer-1',
                workspaceId: 'workspace-1',
                metadata: { targetUserId: 'user-2' },
            });
            expect(activityLogService.prepare).toHaveBeenNthCalledWith(2, {
                action: EnumActivityLogAction.workspaceJoinAcceptedByAdmin,
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
                notificationQueue.sendWorkspaceJoinAccepted
            ).toHaveBeenCalledWith(
                recipient,
                { workspaceId: 'workspace-1', workspaceName: 'Acme' },
                'reviewer-1',
                'join-request-1'
            );
        });

        it('prepares a single row when the reviewer is the requester', async () => {
            await useCase.execute(workspace, 'user-2', 'join-request-1');

            expect(activityLogService.prepare).toHaveBeenCalledTimes(1);
            expect(activityLogService.stagePrepared).toHaveBeenCalledWith([
                stagedActivityLog,
            ]);
        });

        it('accepts without notifying when the requester is no longer active', async () => {
            userService.getOneActive.mockResolvedValue(null);

            await useCase.execute(workspace, 'reviewer-1', 'join-request-1');

            expect(
                workspaceJoinRequestService.acceptJoinRequest
            ).toHaveBeenCalled();
            expect(notificationService.getRecipient).not.toHaveBeenCalled();
            expect(
                notificationQueue.sendWorkspaceJoinAccepted
            ).not.toHaveBeenCalled();
        });

        it('reads nothing when the gate rejects', async () => {
            featureFlagService.validateFeatureFlagMetadata.mockRejectedValue(
                new FeatureFlagDisabledException()
            );

            await expect(
                useCase.execute(workspace, 'reviewer-1', 'join-request-1')
            ).rejects.toBeInstanceOf(FeatureFlagDisabledException);
            expect(
                workspaceJoinRequestService.getPendingById
            ).not.toHaveBeenCalled();
        });

        it('stops before the recipient read when the request is not pending', async () => {
            workspaceJoinRequestService.getPendingById.mockRejectedValue(
                new WorkspaceJoinRequestNotFoundException()
            );

            await expect(
                useCase.execute(workspace, 'reviewer-1', 'join-request-1')
            ).rejects.toBeInstanceOf(WorkspaceJoinRequestNotFoundException);
            expect(userService.getOneActive).not.toHaveBeenCalled();
        });

        it('accepts nothing when the recipient read rejects', async () => {
            const failure = new Error('read-failed');
            notificationService.getRecipient.mockRejectedValue(failure);

            await expect(
                useCase.execute(workspace, 'reviewer-1', 'join-request-1')
            ).rejects.toBe(failure);
            expect(
                workspaceJoinRequestService.acceptJoinRequest
            ).not.toHaveBeenCalled();
            expect(activityLogService.stagePrepared).not.toHaveBeenCalled();
        });

        it('stages nothing and notifies nobody when the accept rejects', async () => {
            workspaceJoinRequestService.acceptJoinRequest.mockRejectedValue(
                new WorkspaceJoinRequestAlreadyProcessedException()
            );

            await expect(
                useCase.execute(workspace, 'reviewer-1', 'join-request-1')
            ).rejects.toBeInstanceOf(
                WorkspaceJoinRequestAlreadyProcessedException
            );
            expect(activityLogService.stagePrepared).not.toHaveBeenCalled();
            expect(
                notificationQueue.sendWorkspaceJoinAccepted
            ).not.toHaveBeenCalled();
        });
    });
});
