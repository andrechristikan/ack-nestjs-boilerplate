import { Test } from '@nestjs/testing';
import type { TestingModule } from '@nestjs/testing';
import { mock } from 'vitest-mock-extended';
import type { MockProxy } from 'vitest-mock-extended';
import {
    EnumActivityLogAction,
    EnumWorkspaceMemberRole,
} from '@generated/prisma-client/client';
import type { WorkspaceMember } from '@generated/prisma-client/client';
import { ActivityLogService } from '@modules/activity-log/services/activity-log.service';
import type { IActivityLogStaged } from '@modules/activity-log/interfaces/activity-log.interface';
import { WorkspaceSelfTransferException } from '@modules/workspace/exceptions/workspace.self-transfer.exception';
import type { WorkspaceTransferOwnershipRequestDto } from '@modules/workspace/dtos/request/workspace.transfer-ownership.request.dto';
import { WorkspaceMemberService } from '@modules/workspace/services/workspace.member.service';
import { WorkspaceTransferOwnershipUseCase } from '@modules/workspace/use-cases/workspace.transfer-ownership.use-case';

describe('WorkspaceTransferOwnershipUseCase', () => {
    const workspaceMemberService: MockProxy<WorkspaceMemberService> =
        mock<WorkspaceMemberService>();
    const activityLogService: MockProxy<ActivityLogService> =
        mock<ActivityLogService>();
    const member: WorkspaceMember = {
        id: 'member-1',
        createdAt: new Date('2026-01-01T00:00:00.000Z'),
        createdBy: null,
        updatedAt: new Date('2026-01-01T00:00:00.000Z'),
        updatedBy: null,
        workspaceId: 'workspace-1',
        userId: 'user-1',
        role: EnumWorkspaceMemberRole.owner,
        joinedAt: new Date('2026-01-01T00:00:00.000Z'),
    };
    const stagedActivityLog: IActivityLogStaged = {
        action: EnumActivityLogAction.workspaceMemberLeft,
        metadata: {},
        userId: null,
        createdBy: null,
        workspaceId: null,
    };
    let useCase: WorkspaceTransferOwnershipUseCase;

    beforeEach(async () => {
        vi.resetAllMocks();
        activityLogService.prepare.mockReturnValue(stagedActivityLog);

        const module: TestingModule = await Test.createTestingModule({
            providers: [
                WorkspaceTransferOwnershipUseCase,
                {
                    provide: WorkspaceMemberService,
                    useValue: workspaceMemberService,
                },
                { provide: ActivityLogService, useValue: activityLogService },
            ],
        }).compile();

        useCase = module.get(WorkspaceTransferOwnershipUseCase);
    });

    describe('execute', () => {
        it('prepares both ownership rows, transfers, and stages them after the transfer', async () => {
            const body: WorkspaceTransferOwnershipRequestDto = {
                targetUserId: 'user-2',
            };
            const callOrder: string[] = [];
            activityLogService.prepare.mockImplementation(() => {
                callOrder.push('prepare');

                return stagedActivityLog;
            });
            workspaceMemberService.transferOwnership.mockImplementation(
                async () => {
                    callOrder.push('transfer');
                }
            );
            activityLogService.stagePrepared.mockImplementation(() => {
                callOrder.push('stage');
            });

            const result = await useCase.execute('workspace-1', member, body);

            expect(result).toEqual({});
            expect(
                workspaceMemberService.transferOwnership
            ).toHaveBeenCalledWith('workspace-1', member, 'user-2');
            expect(activityLogService.prepare).toHaveBeenNthCalledWith(1, {
                action: EnumActivityLogAction.workspaceOwnershipTransferred,
                userId: 'user-1',
                createdBy: 'user-1',
                workspaceId: 'workspace-1',
                metadata: { targetUserId: 'user-2' },
            });
            expect(activityLogService.prepare).toHaveBeenNthCalledWith(2, {
                action: EnumActivityLogAction.workspaceOwnershipTransferredByOwner,
                userId: 'user-2',
                createdBy: 'user-1',
                workspaceId: 'workspace-1',
                metadata: { actorUserId: 'user-1' },
            });
            expect(activityLogService.stagePrepared).toHaveBeenCalledWith([
                stagedActivityLog,
                stagedActivityLog,
            ]);
            expect(callOrder).toEqual([
                'prepare',
                'prepare',
                'transfer',
                'stage',
            ]);
        });

        it('stages nothing when the transfer rejects', async () => {
            workspaceMemberService.transferOwnership.mockRejectedValue(
                new WorkspaceSelfTransferException()
            );

            await expect(
                useCase.execute('workspace-1', member, {
                    targetUserId: 'user-1',
                })
            ).rejects.toBeInstanceOf(WorkspaceSelfTransferException);
            expect(activityLogService.stagePrepared).not.toHaveBeenCalled();
        });
    });
});
