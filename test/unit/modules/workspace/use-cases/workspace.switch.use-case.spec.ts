import { Test } from '@nestjs/testing';
import type { TestingModule } from '@nestjs/testing';
import { mock } from 'vitest-mock-extended';
import type { MockProxy } from 'vitest-mock-extended';
import {
    EnumActivityLogAction,
    EnumWorkspaceMemberRole,
} from '@generated/prisma-client/client';
import type {
    Workspace,
    WorkspaceMember,
} from '@generated/prisma-client/client';
import { ActivityLogService } from '@modules/activity-log/services/activity-log.service';
import type { IActivityLogStaged } from '@modules/activity-log/interfaces/activity-log.interface';
import { UserService } from '@modules/user/services/user.service';
import { WorkspaceMemberService } from '@modules/workspace/services/workspace.member.service';
import { WorkspaceMemberForbiddenException } from '@modules/workspace/exceptions/workspace.member-forbidden.exception';
import { WorkspaceNotFoundException } from '@modules/workspace/exceptions/workspace.not-found.exception';
import type { WorkspaceSwitchRequestDto } from '@modules/workspace/dtos/request/workspace.switch.request.dto';
import { WorkspaceService } from '@modules/workspace/services/workspace.service';
import { WorkspaceSwitchUseCase } from '@modules/workspace/use-cases/workspace.switch.use-case';

describe('WorkspaceSwitchUseCase', () => {
    const workspaceService: MockProxy<WorkspaceService> =
        mock<WorkspaceService>();
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
        isPublic: false,
    };
    const workspaceMember: WorkspaceMember = {
        id: 'member-1',
        createdAt: new Date('2026-01-01T00:00:00.000Z'),
        createdBy: null,
        updatedAt: new Date('2026-01-01T00:00:00.000Z'),
        updatedBy: null,
        workspaceId: 'workspace-1',
        userId: 'user-1',
        role: EnumWorkspaceMemberRole.member,
        joinedAt: new Date('2026-01-01T00:00:00.000Z'),
    };
    const stagedActivityLog: IActivityLogStaged = {
        action: EnumActivityLogAction.workspaceCreated,
        metadata: {},
        userId: null,
        createdBy: null,
        workspaceId: null,
    };
    let useCase: WorkspaceSwitchUseCase;

    beforeEach(async () => {
        vi.resetAllMocks();
        activityLogService.prepare.mockReturnValue(stagedActivityLog);

        const module: TestingModule = await Test.createTestingModule({
            providers: [
                WorkspaceSwitchUseCase,
                { provide: WorkspaceService, useValue: workspaceService },
                {
                    provide: WorkspaceMemberService,
                    useValue: workspaceMemberService,
                },
                { provide: UserService, useValue: userService },
                { provide: ActivityLogService, useValue: activityLogService },
            ],
        }).compile();

        useCase = module.get(WorkspaceSwitchUseCase);
    });

    describe('execute', () => {
        const body: WorkspaceSwitchRequestDto = { workspaceId: 'workspace-1' };

        it('guards the workspace then the membership, prepares the switched activity, sets the last workspace, and stages it', async () => {
            const callOrder: string[] = [];
            workspaceService.validateWorkspaceGuard.mockImplementation(
                async () => {
                    callOrder.push('workspaceGuard');

                    return workspace;
                }
            );
            workspaceMemberService.validateWorkspaceMemberGuard.mockImplementation(
                async () => {
                    callOrder.push('memberGuard');

                    return workspaceMember;
                }
            );
            activityLogService.prepare.mockImplementation(() => {
                callOrder.push('prepare');

                return stagedActivityLog;
            });
            userService.setLastWorkspace.mockImplementation(async () => {
                callOrder.push('setLastWorkspace');
            });
            activityLogService.stagePrepared.mockImplementation(() => {
                callOrder.push('stage');
            });

            const result = await useCase.execute('user-1', body);

            expect(result).toEqual({});
            expect(callOrder).toEqual([
                'workspaceGuard',
                'memberGuard',
                'prepare',
                'setLastWorkspace',
                'stage',
            ]);
            expect(
                workspaceService.validateWorkspaceGuard
            ).toHaveBeenCalledWith('workspace-1');
            expect(
                workspaceMemberService.validateWorkspaceMemberGuard
            ).toHaveBeenCalledWith('workspace-1', 'user-1');
            expect(activityLogService.prepare).toHaveBeenCalledWith({
                action: EnumActivityLogAction.workspaceSwitched,
                userId: 'user-1',
                createdBy: 'user-1',
                workspaceId: 'workspace-1',
            });
            expect(userService.setLastWorkspace).toHaveBeenCalledWith(
                'user-1',
                'workspace-1'
            );
        });

        it('stops before the membership guard when the workspace guard rejects', async () => {
            workspaceService.validateWorkspaceGuard.mockRejectedValue(
                new WorkspaceNotFoundException()
            );

            await expect(
                useCase.execute('user-1', body)
            ).rejects.toBeInstanceOf(WorkspaceNotFoundException);
            expect(
                workspaceMemberService.validateWorkspaceMemberGuard
            ).not.toHaveBeenCalled();
            expect(userService.setLastWorkspace).not.toHaveBeenCalled();
            expect(activityLogService.stagePrepared).not.toHaveBeenCalled();
        });

        it('switches nothing and stages nothing when the membership guard rejects', async () => {
            workspaceService.validateWorkspaceGuard.mockResolvedValue(
                workspace
            );
            workspaceMemberService.validateWorkspaceMemberGuard.mockRejectedValue(
                new WorkspaceMemberForbiddenException()
            );

            await expect(
                useCase.execute('user-1', body)
            ).rejects.toBeInstanceOf(WorkspaceMemberForbiddenException);
            expect(userService.setLastWorkspace).not.toHaveBeenCalled();
            expect(activityLogService.stagePrepared).not.toHaveBeenCalled();
        });
    });
});
