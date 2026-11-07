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
import type { WorkspaceJoinRequestCreateRequestDto } from '@modules/workspace/dtos/request/workspace.join-request-create.request.dto';
import { WorkspaceJoinRequestService } from '@modules/workspace/services/workspace.join-request.service';
import { WorkspaceMemberService } from '@modules/workspace/services/workspace.member.service';
import { WorkspaceNotPublicException } from '@modules/workspace/exceptions/workspace.not-public.exception';
import { WorkspaceUtil } from '@modules/workspace/utils/workspace.util';
import { TestRecipient } from '@test/unit/helpers/test.unit.notification-push.helper';
import { WorkspaceCreateJoinRequestUseCase } from '@modules/workspace/use-cases/workspace.create-join-request.use-case';

describe('WorkspaceCreateJoinRequestUseCase', () => {
    const workspaceJoinRequestService: MockProxy<WorkspaceJoinRequestService> =
        mock<WorkspaceJoinRequestService>();
    const workspaceMemberService: MockProxy<WorkspaceMemberService> =
        mock<WorkspaceMemberService>();
    const userService: MockProxy<UserService> = mock<UserService>();
    const notificationService: MockProxy<NotificationService> =
        mock<NotificationService>();
    const featureFlagService: MockProxy<FeatureFlagService> =
        mock<FeatureFlagService>();
    const activityLogService: MockProxy<ActivityLogService> =
        mock<ActivityLogService>();
    const notificationQueue: MockProxy<NotificationQueue> =
        mock<NotificationQueue>();
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
    let useCase: WorkspaceCreateJoinRequestUseCase;

    beforeEach(async () => {
        vi.resetAllMocks();
        activityLogService.prepare.mockReturnValue(stagedActivityLog);

        const module: TestingModule = await Test.createTestingModule({
            providers: [
                WorkspaceCreateJoinRequestUseCase,
                {
                    provide: WorkspaceJoinRequestService,
                    useValue: workspaceJoinRequestService,
                },
                {
                    provide: WorkspaceMemberService,
                    useValue: workspaceMemberService,
                },
                { provide: UserService, useValue: userService },
                { provide: NotificationService, useValue: notificationService },
                { provide: FeatureFlagService, useValue: featureFlagService },
                { provide: ActivityLogService, useValue: activityLogService },
                { provide: NotificationQueue, useValue: notificationQueue },
                { provide: WorkspaceUtil, useValue: workspaceUtil },
            ],
        }).compile();

        useCase = module.get(WorkspaceCreateJoinRequestUseCase);
    });

    describe('execute', () => {
        const body: WorkspaceJoinRequestCreateRequestDto = {
            workspaceId: 'workspace-1',
            message: 'Please let me in',
        };

        beforeEach(() => {
            workspaceJoinRequestService.getJoinableWorkspace.mockResolvedValue(
                workspace
            );
            workspaceJoinRequestService.createJoinRequest.mockResolvedValue(
                joinRequest
            );
            userService.getNameById.mockResolvedValue({
                name: 'Jane Doe',
                username: 'jane',
            });
            workspaceUtil.resolveRequesterName.mockReturnValue('Jane Doe');
            workspaceMemberService.getReviewerUserIds.mockResolvedValue([
                'reviewer-1',
            ]);
            userService.getManyActiveByIds.mockResolvedValue([reviewer]);
            notificationService.getRecipient.mockResolvedValue(
                reviewerRecipient
            );
            workspaceUtil.buildJoinRequestReviewLink.mockReturnValue(
                'https://app.example.com/review/join-request-1'
            );
        });

        it('gates on the flag, reads the target, creates the request, stages the activity, and notifies the reviewers in order', async () => {
            const callOrder: string[] = [];
            featureFlagService.validateFeatureFlagMetadata.mockImplementation(
                async () => {
                    callOrder.push('gate');
                }
            );
            workspaceJoinRequestService.getJoinableWorkspace.mockImplementation(
                async () => {
                    callOrder.push('joinable');

                    return workspace;
                }
            );
            userService.getNameById.mockImplementation(async () => {
                callOrder.push('requesterName');

                return { name: 'Jane Doe', username: 'jane' };
            });
            notificationService.getRecipient.mockImplementation(async () => {
                callOrder.push('reviewerRecipient');

                return reviewerRecipient;
            });
            workspaceJoinRequestService.createJoinRequest.mockImplementation(
                async () => {
                    callOrder.push('create');

                    return joinRequest;
                }
            );
            activityLogService.stagePrepared.mockImplementation(() => {
                callOrder.push('stage');
            });
            notificationQueue.sendWorkspaceJoinRequestBulk.mockImplementation(
                async () => {
                    callOrder.push('notify');
                }
            );

            const result = await useCase.execute('user-2', body);

            expect(result).toEqual({ data: joinRequest });
            expect(callOrder.slice(0, 2)).toEqual(['gate', 'joinable']);
            expect(callOrder.slice(-3)).toEqual(['create', 'stage', 'notify']);
            expect(
                featureFlagService.validateFeatureFlagMetadata
            ).toHaveBeenCalledWith(
                EnumFeatureFlagKey.workspace,
                EnumFeatureFlagMetadataKey.joinRequestAllowed
            );
            expect(
                workspaceJoinRequestService.getJoinableWorkspace
            ).toHaveBeenCalledWith('user-2', 'workspace-1');
            expect(
                workspaceJoinRequestService.createJoinRequest
            ).toHaveBeenCalledWith('user-2', {
                workspaceId: 'workspace-1',
                message: 'Please let me in',
            });
            expect(activityLogService.prepare).toHaveBeenCalledWith({
                action: EnumActivityLogAction.workspaceJoinRequested,
                userId: 'user-2',
                createdBy: 'user-2',
                workspaceId: 'workspace-1',
            });
            expect(activityLogService.stagePrepared).toHaveBeenCalledWith([
                stagedActivityLog,
            ]);
            expect(
                workspaceMemberService.getReviewerUserIds
            ).toHaveBeenCalledWith('workspace-1');
            expect(userService.getManyActiveByIds).toHaveBeenCalledWith([
                'reviewer-1',
            ]);
            expect(notificationService.getRecipient).toHaveBeenCalledWith(
                reviewer,
                EnumNotificationKind.workspaceJoinRequest
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
            await useCase.execute('user-2', {
                workspaceId: 'workspace-1',
            });

            expect(
                workspaceJoinRequestService.createJoinRequest
            ).toHaveBeenCalledWith('user-2', {
                workspaceId: 'workspace-1',
                message: null,
            });
        });

        it('notifies nobody when the workspace has no active reviewer', async () => {
            workspaceMemberService.getReviewerUserIds.mockResolvedValue([]);
            userService.getManyActiveByIds.mockResolvedValue([]);

            const result = await useCase.execute('user-2', body);

            expect(result).toEqual({ data: joinRequest });
            expect(
                notificationQueue.sendWorkspaceJoinRequestBulk
            ).not.toHaveBeenCalled();
            expect(
                workspaceUtil.buildJoinRequestReviewLink
            ).not.toHaveBeenCalled();
        });

        it('reads nothing when the gate rejects', async () => {
            featureFlagService.validateFeatureFlagMetadata.mockRejectedValue(
                new FeatureFlagDisabledException()
            );

            await expect(
                useCase.execute('user-2', body)
            ).rejects.toBeInstanceOf(FeatureFlagDisabledException);
            expect(
                workspaceJoinRequestService.getJoinableWorkspace
            ).not.toHaveBeenCalled();
        });

        it('reads no target when the workspace is not joinable', async () => {
            workspaceJoinRequestService.getJoinableWorkspace.mockRejectedValue(
                new WorkspaceNotPublicException()
            );

            await expect(
                useCase.execute('user-2', body)
            ).rejects.toBeInstanceOf(WorkspaceNotPublicException);
            expect(userService.getNameById).not.toHaveBeenCalled();
            expect(
                workspaceJoinRequestService.createJoinRequest
            ).not.toHaveBeenCalled();
        });

        it('creates nothing and stages nothing when a reviewer recipient read rejects', async () => {
            const failure = new Error('read-failed');
            notificationService.getRecipient.mockRejectedValue(failure);

            await expect(useCase.execute('user-2', body)).rejects.toBe(failure);
            expect(
                workspaceJoinRequestService.createJoinRequest
            ).not.toHaveBeenCalled();
            expect(activityLogService.stagePrepared).not.toHaveBeenCalled();
        });

        it('stages nothing and notifies nobody when the create rejects', async () => {
            workspaceJoinRequestService.createJoinRequest.mockRejectedValue(
                new WorkspaceNotPublicException()
            );

            await expect(
                useCase.execute('user-2', body)
            ).rejects.toBeInstanceOf(WorkspaceNotPublicException);
            expect(activityLogService.stagePrepared).not.toHaveBeenCalled();
            expect(
                notificationQueue.sendWorkspaceJoinRequestBulk
            ).not.toHaveBeenCalled();
        });
    });
});
