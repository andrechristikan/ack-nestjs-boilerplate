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
import { WorkspaceMemberNotFoundException } from '@modules/workspace/exceptions/workspace.member-not-found.exception';
import type { WorkspaceMemberUpdateRoleRequestDto } from '@modules/workspace/dtos/request/workspace.member-update-role.request.dto';
import { WorkspaceMemberService } from '@modules/workspace/services/workspace.member.service';
import { WorkspaceUpdateMemberRoleUseCase } from '@modules/workspace/use-cases/workspace.update-member-role.use-case';

describe('WorkspaceUpdateMemberRoleUseCase', () => {
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
    let useCase: WorkspaceUpdateMemberRoleUseCase;

    beforeEach(async () => {
        vi.resetAllMocks();
        activityLogService.prepare.mockReturnValue(stagedActivityLog);

        const module: TestingModule = await Test.createTestingModule({
            providers: [
                WorkspaceUpdateMemberRoleUseCase,
                {
                    provide: WorkspaceMemberService,
                    useValue: workspaceMemberService,
                },
                { provide: ActivityLogService, useValue: activityLogService },
            ],
        }).compile();

        useCase = module.get(WorkspaceUpdateMemberRoleUseCase);
    });

    describe('execute', () => {
        const target: WorkspaceMember = {
            ...member,
            id: 'member-2',
            userId: 'user-2',
            role: EnumWorkspaceMemberRole.member,
        };

        it('updates the role then stages the actor row and the target row from the returned target', async () => {
            const body: WorkspaceMemberUpdateRoleRequestDto = {
                role: EnumWorkspaceMemberRole.admin,
            };
            workspaceMemberService.updateMemberRole.mockResolvedValue(target);

            const result = await useCase.execute(
                'workspace-1',
                member,
                'member-2',
                body
            );

            expect(result).toEqual({});
            expect(
                workspaceMemberService.updateMemberRole
            ).toHaveBeenCalledWith(
                'workspace-1',
                member,
                'member-2',
                EnumWorkspaceMemberRole.admin
            );
            expect(activityLogService.prepare).toHaveBeenNthCalledWith(1, {
                action: EnumActivityLogAction.workspaceMemberRoleUpdated,
                userId: 'user-1',
                createdBy: 'user-1',
                workspaceId: 'workspace-1',
                metadata: { targetUserId: 'user-2' },
            });
            expect(activityLogService.prepare).toHaveBeenNthCalledWith(2, {
                action: EnumActivityLogAction.workspaceMemberRoleUpdatedByAdmin,
                userId: 'user-2',
                createdBy: 'user-1',
                workspaceId: 'workspace-1',
                metadata: { actorUserId: 'user-1' },
            });
            expect(activityLogService.stagePrepared).toHaveBeenCalledWith([
                stagedActivityLog,
                stagedActivityLog,
            ]);
        });

        it('stages nothing when the update rejects', async () => {
            workspaceMemberService.updateMemberRole.mockRejectedValue(
                new WorkspaceMemberNotFoundException()
            );

            await expect(
                useCase.execute('workspace-1', member, 'member-2', {
                    role: EnumWorkspaceMemberRole.admin,
                })
            ).rejects.toBeInstanceOf(WorkspaceMemberNotFoundException);
            expect(activityLogService.prepare).not.toHaveBeenCalled();
            expect(activityLogService.stagePrepared).not.toHaveBeenCalled();
        });
    });
});
