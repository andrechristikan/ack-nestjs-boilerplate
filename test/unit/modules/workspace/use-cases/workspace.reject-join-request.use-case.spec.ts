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
import type { WorkspaceJoinRequestRejectRequestDto } from '@modules/workspace/dtos/request/workspace.join-request-reject.request.dto';
import { WorkspaceJoinRequestService } from '@modules/workspace/services/workspace.join-request.service';
import { WorkspaceJoinRequestAlreadyProcessedException } from '@modules/workspace/exceptions/workspace.join-request-already-processed.exception';
import { WorkspaceRejectJoinRequestUseCase } from '@modules/workspace/use-cases/workspace.reject-join-request.use-case';

describe('WorkspaceRejectJoinRequestUseCase', () => {
    const workspaceJoinRequestService: MockProxy<WorkspaceJoinRequestService> =
        mock<WorkspaceJoinRequestService>();
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
        });

        it('gates, reads the pending request, rejects with the workspace name and reason, and stages the rows in order', async () => {
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
            workspaceJoinRequestService.rejectJoinRequest.mockImplementation(
                async () => {
                    callOrder.push('reject');
                }
            );
            activityLogService.stagePrepared.mockImplementation(() => {
                callOrder.push('stage');
            });

            const result = await useCase.execute(
                workspace,
                'reviewer-1',
                'join-request-1',
                body
            );

            expect(result).toEqual({});
            expect(callOrder).toEqual(['gate', 'pending', 'reject', 'stage']);

            expect(
                workspaceJoinRequestService.rejectJoinRequest
            ).toHaveBeenCalledWith(
                joinRequest,
                'reviewer-1',
                'Acme',
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
        });

        it('prepares a single row when the reviewer is the requester', async () => {
            await useCase.execute(workspace, 'user-2', 'join-request-1', body);

            expect(activityLogService.prepare).toHaveBeenCalledTimes(1);
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

        it('stages nothing when the reject rejects', async () => {
            workspaceJoinRequestService.rejectJoinRequest.mockRejectedValue(
                new WorkspaceJoinRequestAlreadyProcessedException()
            );

            await expect(
                useCase.execute(workspace, 'reviewer-1', 'join-request-1', body)
            ).rejects.toBeInstanceOf(
                WorkspaceJoinRequestAlreadyProcessedException
            );
            expect(activityLogService.stagePrepared).not.toHaveBeenCalled();
        });
    });
});
