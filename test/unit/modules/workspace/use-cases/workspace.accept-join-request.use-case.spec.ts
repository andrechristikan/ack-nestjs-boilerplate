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
import { WorkspaceJoinRequestService } from '@modules/workspace/services/workspace.join-request.service';
import { WorkspaceJoinRequestAlreadyProcessedException } from '@modules/workspace/exceptions/workspace.join-request-already-processed.exception';
import { WorkspaceJoinRequestNotFoundException } from '@modules/workspace/exceptions/workspace.join-request-not-found.exception';
import { WorkspaceAcceptJoinRequestUseCase } from '@modules/workspace/use-cases/workspace.accept-join-request.use-case';

describe('WorkspaceAcceptJoinRequestUseCase', () => {
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
                { provide: ActivityLogService, useValue: activityLogService },
            ],
        }).compile();

        useCase = module.get(WorkspaceAcceptJoinRequestUseCase);
    });

    describe('execute', () => {
        beforeEach(() => {
            workspaceJoinRequestService.getPendingById.mockResolvedValue(
                joinRequest
            );
        });

        it('gates, reads the pending request, accepts with the workspace name, and stages the rows in order', async () => {
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
            workspaceJoinRequestService.acceptJoinRequest.mockImplementation(
                async () => {
                    callOrder.push('accept');
                }
            );
            activityLogService.stagePrepared.mockImplementation(() => {
                callOrder.push('stage');
            });

            const result = await useCase.execute(
                workspace,
                'reviewer-1',
                'join-request-1'
            );

            expect(result).toEqual({});
            expect(callOrder).toEqual(['gate', 'pending', 'accept', 'stage']);
            expect(
                workspaceJoinRequestService.assertJoinRequestAllowed
            ).toHaveBeenCalledTimes(1);
            expect(
                workspaceJoinRequestService.getPendingById
            ).toHaveBeenCalledWith('join-request-1', 'workspace-1');
            expect(
                workspaceJoinRequestService.acceptJoinRequest
            ).toHaveBeenCalledWith(joinRequest, 'reviewer-1', 'Acme');
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
        });

        it('prepares a single row when the reviewer is the requester', async () => {
            await useCase.execute(workspace, 'user-2', 'join-request-1');

            expect(activityLogService.prepare).toHaveBeenCalledTimes(1);
            expect(activityLogService.stagePrepared).toHaveBeenCalledWith([
                stagedActivityLog,
            ]);
        });

        it('runs the join-request gate first and stops when it rejects', async () => {
            workspaceJoinRequestService.assertJoinRequestAllowed.mockRejectedValue(
                new FeatureFlagDisabledException()
            );

            await expect(
                useCase.execute(workspace, 'reviewer-1', 'join-request-1')
            ).rejects.toBeInstanceOf(FeatureFlagDisabledException);
            expect(
                workspaceJoinRequestService.getPendingById
            ).not.toHaveBeenCalled();
        });

        it('accepts nothing when the request is not pending', async () => {
            workspaceJoinRequestService.getPendingById.mockRejectedValue(
                new WorkspaceJoinRequestNotFoundException()
            );

            await expect(
                useCase.execute(workspace, 'reviewer-1', 'join-request-1')
            ).rejects.toBeInstanceOf(WorkspaceJoinRequestNotFoundException);
            expect(
                workspaceJoinRequestService.acceptJoinRequest
            ).not.toHaveBeenCalled();
        });

        it('stages nothing when the accept rejects', async () => {
            workspaceJoinRequestService.acceptJoinRequest.mockRejectedValue(
                new WorkspaceJoinRequestAlreadyProcessedException()
            );

            await expect(
                useCase.execute(workspace, 'reviewer-1', 'join-request-1')
            ).rejects.toBeInstanceOf(
                WorkspaceJoinRequestAlreadyProcessedException
            );
            expect(activityLogService.stagePrepared).not.toHaveBeenCalled();
        });
    });
});
