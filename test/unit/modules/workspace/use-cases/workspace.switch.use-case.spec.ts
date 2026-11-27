import { buildActivityLogCreateManyEffect } from '@test/unit/helpers/test.unit.activity-log-effect.helper';
import { Test } from '@nestjs/testing';
import type { TestingModule } from '@nestjs/testing';
import { mock } from 'vitest-mock-extended';
import type { MockProxy } from 'vitest-mock-extended';
import { EnumActivityLogAction } from '@generated/prisma-client/client';
import type {
    Workspace,
    WorkspaceMember,
} from '@generated/prisma-client/client';
import type { IDatabaseTransactionClient } from '@common/database/interfaces/database.client.interface';
import { ActivityLogQueue } from '@modules/activity-log/queues/activity-log.queue';
import { DatabaseService } from '@common/database/services/database.service';
import { OutboxService } from '@common/outbox/services/outbox.service';
import { UserService } from '@modules/user/services/user.service';
import { WorkspaceMemberService } from '@modules/workspace/services/workspace.member.service';
import { WorkspaceMemberForbiddenException } from '@modules/workspace/exceptions/workspace.member-forbidden.exception';
import { WorkspaceNotFoundException } from '@modules/workspace/exceptions/workspace.not-found.exception';
import type { WorkspaceSwitchRequestDto } from '@modules/workspace/dtos/request/workspace.switch.request.dto';
import type { IWorkspaceContext } from '@modules/workspace/interfaces/workspace.interface';
import { WorkspaceSwitchUseCase } from '@modules/workspace/use-cases/workspace.switch.use-case';
import {
    buildApiKeyContext,
    buildAuthJwtAccessContext,
    buildRequestContext,
    buildUser,
    buildUserContext,
    buildWorkspace,
    buildWorkspaceMember,
} from '@test/unit/helpers/test.unit.request.helper';
import { EnumWorkspaceStatusCodeError } from '@modules/workspace/enums/workspace.status-code.enum';

describe('WorkspaceSwitchUseCase', () => {
    const workspaceMemberService: MockProxy<WorkspaceMemberService> =
        mock<WorkspaceMemberService>();
    const userService: MockProxy<UserService> = mock<UserService>();
    const activityLogQueue: MockProxy<ActivityLogQueue> =
        mock<ActivityLogQueue>();
    const databaseService: MockProxy<DatabaseService> = mock<DatabaseService>();
    const outboxService: MockProxy<OutboxService> = mock<OutboxService>();
    const tx = mock<IDatabaseTransactionClient>();
    const entry = buildActivityLogCreateManyEffect('entry');
    const workspace: Workspace = buildWorkspace();
    const workspaceMember: WorkspaceMember = buildWorkspaceMember('user-1');
    const workspaceContext: IWorkspaceContext = {
        workspaceId: 'workspace-1',
        workspace,
        workspaceMember,
    };
    const requestContext = buildRequestContext();
    const apiKeyContext = buildApiKeyContext();
    const userContext = buildUserContext(
        buildUser('user-1', 'jane@example.com')
    );
    const authContext = buildAuthJwtAccessContext(userContext.user.id);

    let useCase: WorkspaceSwitchUseCase;

    beforeEach(async () => {
        activityLogQueue.recordEffect.mockReturnValue(entry);
        databaseService.withTransaction.mockImplementation(
            async fn => fn(tx) as never
        );

        const module: TestingModule = await Test.createTestingModule({
            providers: [
                WorkspaceSwitchUseCase,
                {
                    provide: WorkspaceMemberService,
                    useValue: workspaceMemberService,
                },
                { provide: UserService, useValue: userService },
                { provide: ActivityLogQueue, useValue: activityLogQueue },
                { provide: DatabaseService, useValue: databaseService },
                { provide: OutboxService, useValue: outboxService },
            ],
        }).compile();

        useCase = module.get(WorkspaceSwitchUseCase);
    });

    describe('execute', () => {
        const body: WorkspaceSwitchRequestDto = { workspaceId: 'workspace-1' };

        it('guards the workspace and the membership in one call, then sets the last workspace and adds the switched entry on one tx', async () => {
            const callOrder: string[] = [];
            workspaceMemberService.validateWorkspaceGuard.mockImplementation(
                async () => {
                    callOrder.push('guard');

                    return workspaceContext;
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
                'guard',
                'setLastWorkspace',
                'addEntry',
            ]);
            expect(
                workspaceMemberService.validateWorkspaceGuard
            ).toHaveBeenCalledTimes(1);
            expect(
                workspaceMemberService.validateWorkspaceGuard
            ).toHaveBeenCalledWith('workspace-1', 'user-1', []);
            expect(userService.setLastWorkspaceInTx).toHaveBeenCalledWith(
                tx,
                'user-1',
                'workspace-1'
            );
            expect(activityLogQueue.recordEffect).toHaveBeenCalledWith(
                requestContext,
                apiKeyContext,
                authContext,
                {
                    action: EnumActivityLogAction.workspaceSwitched,
                    userId: 'user-1',
                    createdBy: 'user-1',
                    workspaceId: 'workspace-1',
                }
            );
            expect(outboxService.addInTx).toHaveBeenCalledWith(tx, entry);
        });

        it('opens no transaction when the workspace is not found', async () => {
            workspaceMemberService.validateWorkspaceGuard.mockRejectedValue(
                new WorkspaceNotFoundException()
            );

            await expect(
                useCase.execute(
                    requestContext,
                    apiKeyContext,
                    authContext,
                    body
                )
            ).rejects.toMatchObject({
                module: 'workspace',
                statusCode: EnumWorkspaceStatusCodeError.notFound,
            });
            expect(databaseService.withTransaction).not.toHaveBeenCalled();
        });

        it('opens no transaction when the caller is no member', async () => {
            workspaceMemberService.validateWorkspaceGuard.mockRejectedValue(
                new WorkspaceMemberForbiddenException()
            );

            await expect(
                useCase.execute(
                    requestContext,
                    apiKeyContext,
                    authContext,
                    body
                )
            ).rejects.toMatchObject({
                module: 'workspace',
                statusCode: EnumWorkspaceStatusCodeError.memberForbidden,
            });
            expect(databaseService.withTransaction).not.toHaveBeenCalled();
        });
    });
});
