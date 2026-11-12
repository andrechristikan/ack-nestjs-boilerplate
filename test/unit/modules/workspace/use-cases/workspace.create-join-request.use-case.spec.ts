import { Test } from '@nestjs/testing';
import type { TestingModule } from '@nestjs/testing';
import { mock } from 'vitest-mock-extended';
import type { MockProxy } from 'vitest-mock-extended';
import {
    EnumActivityLogAction,
    EnumWorkspaceJoinRequestStatus,
} from '@generated/prisma-client/client';
import type {
    Workspace,
    WorkspaceJoinRequest,
} from '@generated/prisma-client/client';
import { ActivityLogService } from '@modules/activity-log/services/activity-log.service';
import type { IActivityLogStaged } from '@modules/activity-log/interfaces/activity-log.interface';
import { FeatureFlagDisabledException } from '@modules/feature-flag/exceptions/feature-flag.disabled.exception';
import { UserService } from '@modules/user/services/user.service';
import type { WorkspaceJoinRequestCreateRequestDto } from '@modules/workspace/dtos/request/workspace.join-request-create.request.dto';
import { WorkspaceJoinRequestService } from '@modules/workspace/services/workspace.join-request.service';
import { WorkspaceMemberService } from '@modules/workspace/services/workspace.member.service';
import { WorkspaceNotPublicException } from '@modules/workspace/exceptions/workspace.not-public.exception';
import { WorkspaceCreateJoinRequestUseCase } from '@modules/workspace/use-cases/workspace.create-join-request.use-case';

describe('WorkspaceCreateJoinRequestUseCase', () => {
    const workspaceJoinRequestService: MockProxy<WorkspaceJoinRequestService> =
        mock<WorkspaceJoinRequestService>();
    const workspaceMemberService: MockProxy<WorkspaceMemberService> =
        mock<WorkspaceMemberService>();
    const userService: MockProxy<UserService> = mock<UserService>();
    const activityLogService: MockProxy<ActivityLogService> =
        mock<ActivityLogService>();
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
                { provide: ActivityLogService, useValue: activityLogService },
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
            workspaceJoinRequestService.resolveRequesterName.mockReturnValue(
                'Jane Doe'
            );
            workspaceMemberService.getReviewerUserIds.mockResolvedValue([
                'reviewer-1',
            ]);
        });

        it('gates on the flag, reads the target, creates the request with the notice, and stages the activity in order', async () => {
            const callOrder: string[] = [];
            workspaceJoinRequestService.assertJoinRequestAllowed.mockImplementation(
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
            workspaceJoinRequestService.createJoinRequest.mockImplementation(
                async () => {
                    callOrder.push('create');

                    return joinRequest;
                }
            );
            activityLogService.stagePrepared.mockImplementation(() => {
                callOrder.push('stage');
            });

            const result = await useCase.execute('user-2', body);

            expect(result).toEqual({ data: joinRequest });
            expect(callOrder.slice(0, 2)).toEqual(['gate', 'joinable']);
            expect(callOrder.slice(-2)).toEqual(['create', 'stage']);
            expect(
                workspaceJoinRequestService.assertJoinRequestAllowed
            ).toHaveBeenCalledTimes(1);
            expect(
                workspaceJoinRequestService.getJoinableWorkspace
            ).toHaveBeenCalledWith('user-2', 'workspace-1');
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
            expect(userService.getNameById).toHaveBeenCalledWith('user-2');
            expect(
                workspaceJoinRequestService.resolveRequesterName
            ).toHaveBeenCalledWith({ name: 'Jane Doe', username: 'jane' });
            expect(
                workspaceJoinRequestService.createJoinRequest
            ).toHaveBeenCalledWith(
                'user-2',
                { workspaceId: 'workspace-1', message: 'Please let me in' },
                {
                    workspaceName: 'Acme',
                    requesterName: 'Jane Doe',
                    reviewerIds: ['reviewer-1'],
                }
            );
        });

        it('passes null for an omitted message', async () => {
            await useCase.execute('user-2', {
                workspaceId: 'workspace-1',
            });

            expect(
                workspaceJoinRequestService.createJoinRequest
            ).toHaveBeenCalledWith(
                'user-2',
                { workspaceId: 'workspace-1', message: null },
                expect.objectContaining({ reviewerIds: ['reviewer-1'] })
            );
        });

        it('passes an empty reviewer list when the workspace has no reviewer', async () => {
            workspaceMemberService.getReviewerUserIds.mockResolvedValue([]);

            const result = await useCase.execute('user-2', body);

            expect(result).toEqual({ data: joinRequest });
            expect(
                workspaceJoinRequestService.createJoinRequest
            ).toHaveBeenCalledWith(
                'user-2',
                { workspaceId: 'workspace-1', message: 'Please let me in' },
                expect.objectContaining({ reviewerIds: [] })
            );
        });

        it('runs the join-request gate first and stops when it rejects', async () => {
            workspaceJoinRequestService.assertJoinRequestAllowed.mockRejectedValue(
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

        it('creates nothing and stages nothing when the reviewer read rejects', async () => {
            const failure = new Error('read-failed');
            workspaceMemberService.getReviewerUserIds.mockRejectedValue(
                failure
            );

            await expect(useCase.execute('user-2', body)).rejects.toBe(failure);
            expect(
                workspaceJoinRequestService.createJoinRequest
            ).not.toHaveBeenCalled();
            expect(activityLogService.stagePrepared).not.toHaveBeenCalled();
        });

        it('stages nothing when the create rejects', async () => {
            workspaceJoinRequestService.createJoinRequest.mockRejectedValue(
                new WorkspaceNotPublicException()
            );

            await expect(
                useCase.execute('user-2', body)
            ).rejects.toBeInstanceOf(WorkspaceNotPublicException);
            expect(activityLogService.stagePrepared).not.toHaveBeenCalled();
        });
    });
});
