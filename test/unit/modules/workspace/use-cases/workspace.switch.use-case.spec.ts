import type { IWorkspaceMemberWithRole } from '@modules/workspace/interfaces/workspace.interface';
import { buildActivityLogCreateManyEffect } from '@test/unit/helpers/test.unit.activity-log-effect.helper';
import { Test } from '@nestjs/testing';
import type { TestingModule } from '@nestjs/testing';
import { mock } from 'vitest-mock-extended';
import type { MockProxy } from 'vitest-mock-extended';
import {
    EnumActivityLogAction,
    EnumRoleScope,
} from '@generated/prisma-client/client';
import type { Workspace } from '@generated/prisma-client/client';
import type { IDatabaseTransactionClient } from '@common/database/interfaces/database.client.interface';
import { ActivityLogService } from '@modules/activity-log/services/activity-log.service';
import { OutboxService } from '@common/outbox/services/outbox.service';
import { UserService } from '@modules/user/services/user.service';
import { WorkspaceMemberService } from '@modules/workspace/services/workspace.member.service';
import { WorkspaceMemberForbiddenException } from '@modules/workspace/exceptions/workspace.member-forbidden.exception';
import { WorkspaceNotFoundException } from '@modules/workspace/exceptions/workspace.not-found.exception';
import type { WorkspaceSwitchRequestDto } from '@modules/workspace/dtos/request/workspace.switch.request.dto';
import { WorkspaceService } from '@modules/workspace/services/workspace.service';
import { WorkspaceSwitchUseCase } from '@modules/workspace/use-cases/workspace.switch.use-case';
import {
    buildUser,
    buildRequestContext,
    buildApiKeyContext,
    buildUserContext,
    buildAuthJwtAccessContext,
} from '@test/unit/helpers/test.unit.request.helper';

describe('WorkspaceSwitchUseCase', () => {
    const workspaceService: MockProxy<WorkspaceService> =
        mock<WorkspaceService>();
    const workspaceMemberService: MockProxy<WorkspaceMemberService> =
        mock<WorkspaceMemberService>();
    const userService: MockProxy<UserService> = mock<UserService>();
    const activityLogService: MockProxy<ActivityLogService> =
        mock<ActivityLogService>();
    const outboxService: MockProxy<OutboxService> = mock<OutboxService>();
    const tx = mock<IDatabaseTransactionClient>();
    const entry = buildActivityLogCreateManyEffect('entry');
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
    const workspaceMember: IWorkspaceMemberWithRole = {
        id: 'member-1',
        createdAt: new Date('2026-01-01T00:00:00.000Z'),
        createdBy: null,
        updatedAt: new Date('2026-01-01T00:00:00.000Z'),
        updatedBy: null,
        workspaceId: 'workspace-1',
        userId: 'user-1',
        roleId: 'role-workspace-member',
        role: {
            id: 'role-workspace-member',
            scope: EnumRoleScope.workspace,
            key: 'member',
            name: 'member',
            policyRevision: 0,
        },
        joinedAt: new Date('2026-01-01T00:00:00.000Z'),
    };
    const requestContext = buildRequestContext();
    const apiKeyContext = buildApiKeyContext();
    const userContext = buildUserContext(
        buildUser('user-1', 'jane@example.com')
    );
    const authContext = buildAuthJwtAccessContext(userContext.user.id);

    let useCase: WorkspaceSwitchUseCase;

    beforeEach(async () => {
        vi.resetAllMocks();
        activityLogService.recordEffect.mockReturnValue(entry);
        outboxService.withTransaction.mockImplementation(
            async fn => fn(tx) as never
        );

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
                { provide: OutboxService, useValue: outboxService },
            ],
        }).compile();

        useCase = module.get(WorkspaceSwitchUseCase);
    });

    describe('execute', () => {
        const body: WorkspaceSwitchRequestDto = { workspaceId: 'workspace-1' };

        it('guards the workspace then the membership, then sets the last workspace and adds the switched entry on one tx', async () => {
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
            userService.setLastWorkspaceInTx.mockImplementation(async () => {
                callOrder.push('setLastWorkspace');
            });
            outboxService.addInTx.mockImplementation(async () => {
                callOrder.push('addEntry');

                return 'outbox-1';
            });

            const result = await useCase.execute(
                requestContext,
                apiKeyContext,
                authContext,
                body
            );

            expect(result).toEqual({});
            expect(callOrder).toEqual([
                'workspaceGuard',
                'memberGuard',
                'setLastWorkspace',
                'addEntry',
            ]);
            expect(
                workspaceService.validateWorkspaceGuard
            ).toHaveBeenCalledWith('workspace-1');
            expect(
                workspaceMemberService.validateWorkspaceMemberGuard
            ).toHaveBeenCalledWith('workspace-1', 'user-1');
            expect(userService.setLastWorkspaceInTx).toHaveBeenCalledWith(
                tx,
                'user-1',
                'workspace-1'
            );
            expect(activityLogService.recordEffect).toHaveBeenCalledWith(
                requestContext,
                apiKeyContext,
                authContext,
                null,
                {
                    action: EnumActivityLogAction.workspaceSwitched,
                    userId: 'user-1',
                    createdBy: 'user-1',
                    workspaceId: 'workspace-1',
                }
            );
            expect(outboxService.addInTx).toHaveBeenCalledWith(tx, entry);
        });

        it('stops before the membership guard when the workspace guard rejects', async () => {
            workspaceService.validateWorkspaceGuard.mockRejectedValue(
                new WorkspaceNotFoundException()
            );

            await expect(
                useCase.execute(
                    requestContext,
                    apiKeyContext,
                    authContext,
                    body
                )
            ).rejects.toBeInstanceOf(WorkspaceNotFoundException);
            expect(
                workspaceMemberService.validateWorkspaceMemberGuard
            ).not.toHaveBeenCalled();
            expect(outboxService.withTransaction).not.toHaveBeenCalled();
        });

        it('opens no transaction when the membership guard rejects', async () => {
            workspaceService.validateWorkspaceGuard.mockResolvedValue(
                workspace
            );
            workspaceMemberService.validateWorkspaceMemberGuard.mockRejectedValue(
                new WorkspaceMemberForbiddenException()
            );

            await expect(
                useCase.execute(
                    requestContext,
                    apiKeyContext,
                    authContext,
                    body
                )
            ).rejects.toBeInstanceOf(WorkspaceMemberForbiddenException);
            expect(outboxService.withTransaction).not.toHaveBeenCalled();
        });
    });
});
