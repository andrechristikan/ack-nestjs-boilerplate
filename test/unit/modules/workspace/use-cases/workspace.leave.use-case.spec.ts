import { Test } from '@nestjs/testing';
import type { TestingModule } from '@nestjs/testing';
import { mock } from 'vitest-mock-extended';
import type { MockProxy } from 'vitest-mock-extended';
import { AppUnknownException } from '@app/exceptions/app.unknown.exception';
import { DatabaseWriteConflictException } from '@common/database/exceptions/database.write-conflict.exception';
import type { IDatabaseTransactionClient } from '@common/database/interfaces/database.client.interface';
import { DatabaseService } from '@common/database/services/database.service';
import { DatabaseUtil } from '@common/database/utils/database.util';
import {
    EnumActivityLogAction,
    EnumWorkspaceMemberRole,
} from '@generated/prisma-client/client';
import type { WorkspaceMember } from '@generated/prisma-client/client';
import { ActivityLogService } from '@modules/activity-log/services/activity-log.service';
import type { IActivityLogStaged } from '@modules/activity-log/interfaces/activity-log.interface';
import { ProjectMemberService } from '@modules/project/services/project.member.service';
import { UserService } from '@modules/user/services/user.service';
import { WorkspaceJoinRequestService } from '@modules/workspace/services/workspace.join-request.service';
import { WorkspaceLastOwnerException } from '@modules/workspace/exceptions/workspace.last-owner.exception';
import { WorkspaceMemberNotFoundException } from '@modules/workspace/exceptions/workspace.member-not-found.exception';
import { WorkspaceMemberService } from '@modules/workspace/services/workspace.member.service';
import { WorkspaceLeaveUseCase } from '@modules/workspace/use-cases/workspace.leave.use-case';

describe('WorkspaceLeaveUseCase', () => {
    const workspaceMemberService: MockProxy<WorkspaceMemberService> =
        mock<WorkspaceMemberService>();
    const activityLogService: MockProxy<ActivityLogService> =
        mock<ActivityLogService>();
    const projectMemberService: MockProxy<ProjectMemberService> =
        mock<ProjectMemberService>();
    const workspaceJoinRequestService: MockProxy<WorkspaceJoinRequestService> =
        mock<WorkspaceJoinRequestService>();
    const userService: MockProxy<UserService> = mock<UserService>();
    const databaseService: MockProxy<DatabaseService> = mock<DatabaseService>();
    const databaseUtil: MockProxy<DatabaseUtil> = mock<DatabaseUtil>();
    const tx: IDatabaseTransactionClient = mock<IDatabaseTransactionClient>();
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
    let useCase: WorkspaceLeaveUseCase;

    beforeEach(async () => {
        vi.resetAllMocks();
        activityLogService.prepare.mockReturnValue(stagedActivityLog);
        databaseService.withTransaction.mockImplementation(async fn => fn(tx));

        const module: TestingModule = await Test.createTestingModule({
            providers: [
                WorkspaceLeaveUseCase,
                {
                    provide: WorkspaceMemberService,
                    useValue: workspaceMemberService,
                },
                { provide: ActivityLogService, useValue: activityLogService },
                {
                    provide: ProjectMemberService,
                    useValue: projectMemberService,
                },
                {
                    provide: WorkspaceJoinRequestService,
                    useValue: workspaceJoinRequestService,
                },
                { provide: UserService, useValue: userService },
                { provide: DatabaseService, useValue: databaseService },
                { provide: DatabaseUtil, useValue: databaseUtil },
            ],
        }).compile();

        useCase = module.get(WorkspaceLeaveUseCase);
    });

    describe('execute', () => {
        it('prepares the left row, leaves and cascades on one transaction, and stages it after', async () => {
            const callOrder: string[] = [];
            activityLogService.prepare.mockImplementation(() => {
                callOrder.push('prepare');

                return stagedActivityLog;
            });
            workspaceMemberService.leaveWorkspaceInTx.mockImplementation(
                async () => {
                    callOrder.push('leave');
                }
            );
            projectMemberService.removeByWorkspaceAndUserInTx.mockImplementation(
                async () => {
                    callOrder.push('projectMembers');

                    return 2;
                }
            );
            workspaceJoinRequestService.cancelPendingByUserInTx.mockImplementation(
                async () => {
                    callOrder.push('joinRequests');

                    return 1;
                }
            );
            userService.clearLastWorkspaceInTx.mockImplementation(async () => {
                callOrder.push('lastWorkspace');
            });
            activityLogService.stagePrepared.mockImplementation(() => {
                callOrder.push('stage');
            });

            const result = await useCase.execute('workspace-1', member);

            expect(result).toEqual({});
            expect(databaseService.withTransaction).toHaveBeenCalledTimes(1);
            expect(
                workspaceMemberService.leaveWorkspaceInTx
            ).toHaveBeenCalledWith(tx, member);
            expect(
                projectMemberService.removeByWorkspaceAndUserInTx
            ).toHaveBeenCalledWith(tx, 'workspace-1', 'user-1');
            expect(
                workspaceJoinRequestService.cancelPendingByUserInTx
            ).toHaveBeenCalledWith(tx, 'workspace-1', 'user-1');
            expect(userService.clearLastWorkspaceInTx).toHaveBeenCalledWith(
                tx,
                'user-1',
                'workspace-1'
            );
            expect(activityLogService.prepare).toHaveBeenCalledWith({
                action: EnumActivityLogAction.workspaceMemberLeft,
                userId: 'user-1',
                createdBy: 'user-1',
                workspaceId: 'workspace-1',
            });
            expect(callOrder).toEqual([
                'prepare',
                'leave',
                'projectMembers',
                'joinRequests',
                'lastWorkspace',
                'stage',
            ]);
        });

        it('runs no cascade and stages nothing when leaving rejects', async () => {
            workspaceMemberService.leaveWorkspaceInTx.mockRejectedValue(
                new WorkspaceLastOwnerException()
            );

            await expect(
                useCase.execute('workspace-1', member)
            ).rejects.toBeInstanceOf(WorkspaceLastOwnerException);
            expect(
                projectMemberService.removeByWorkspaceAndUserInTx
            ).not.toHaveBeenCalled();
            expect(
                workspaceJoinRequestService.cancelPendingByUserInTx
            ).not.toHaveBeenCalled();
            expect(userService.clearLastWorkspaceInTx).not.toHaveBeenCalled();
            expect(activityLogService.stagePrepared).not.toHaveBeenCalled();
        });

        it('maps a write conflict to WorkspaceMemberNotFoundException', async () => {
            const conflict = new Error('conflict');
            workspaceMemberService.leaveWorkspaceInTx.mockRejectedValue(
                conflict
            );
            databaseUtil.toException.mockReturnValue(
                new DatabaseWriteConflictException()
            );

            await expect(
                useCase.execute('workspace-1', member)
            ).rejects.toBeInstanceOf(WorkspaceMemberNotFoundException);
            expect(databaseUtil.toException).toHaveBeenCalledWith(conflict);
            expect(activityLogService.stagePrepared).not.toHaveBeenCalled();
        });

        it('wraps any other transaction error in AppUnknownException', async () => {
            workspaceMemberService.leaveWorkspaceInTx.mockRejectedValue(
                new Error('boom')
            );
            databaseUtil.toException.mockReturnValue(null);

            await expect(
                useCase.execute('workspace-1', member)
            ).rejects.toBeInstanceOf(AppUnknownException);
        });
    });
});
