import { Test } from '@nestjs/testing';
import type { TestingModule } from '@nestjs/testing';
import type { ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { mock } from 'vitest-mock-extended';
import type { MockProxy } from 'vitest-mock-extended';
import { EnumWorkspaceMemberRole } from '@generated/prisma-client/client';
import { UserContextStoreKey } from '@modules/user/constants/user.constant';
import { EnumUserStatusCodeError } from '@modules/user/enums/user.status-code.enum';
import {
    WorkspaceContextStoreKey,
    WorkspaceIdStoreKey,
    WorkspaceRoleMetaKey,
} from '@modules/workspace/constants/workspace.constant';
import { RequestStoreService } from '@common/request/services/request.store.service';
import { WorkspaceMemberService } from '@modules/workspace/services/workspace.member.service';
import { WorkspaceGuard } from '@modules/workspace/guards/workspace.guard';
import {
    buildUser,
    buildUserContext,
    buildWorkspace,
    buildWorkspaceContext,
    buildWorkspaceMember,
} from '@test/unit/helpers/test.unit.request.helper';

describe('WorkspaceGuard', () => {
    const reflector: MockProxy<Reflector> = mock<Reflector>();
    const workspaceMemberService: MockProxy<WorkspaceMemberService> =
        mock<WorkspaceMemberService>();
    const requestStoreService: MockProxy<RequestStoreService> =
        mock<RequestStoreService>();
    const executionContext: MockProxy<ExecutionContext> =
        mock<ExecutionContext>();
    const handler = vi.fn();
    const userContext = buildUserContext(
        buildUser('user-1', 'jane@example.com')
    );
    const workspaceContext = buildWorkspaceContext(
        buildWorkspace(),
        buildWorkspaceMember('user-1', EnumWorkspaceMemberRole.admin)
    );

    let guard: WorkspaceGuard;

    beforeEach(async () => {
        executionContext.getHandler.mockReturnValue(handler);

        const module: TestingModule = await Test.createTestingModule({
            providers: [
                WorkspaceGuard,
                { provide: Reflector, useValue: reflector },
                {
                    provide: WorkspaceMemberService,
                    useValue: workspaceMemberService,
                },
                { provide: RequestStoreService, useValue: requestStoreService },
            ],
        }).compile();

        guard = module.get(WorkspaceGuard);
    });

    describe('canActivate', () => {
        it('passes the stored workspace id, the user id, and the roles metadata in one call and merges the returned context', async () => {
            const store: Record<string, unknown> = {
                [WorkspaceIdStoreKey]: 'workspace-1',
                [UserContextStoreKey]: userContext,
            };
            requestStoreService.get.mockImplementation(
                key => store[key] ?? null
            );
            reflector.get.mockReturnValue([EnumWorkspaceMemberRole.admin]);
            workspaceMemberService.validateWorkspaceGuard.mockResolvedValue(
                workspaceContext
            );

            const result = await guard.canActivate(executionContext);

            expect(result).toBe(true);
            expect(reflector.get).toHaveBeenCalledWith(
                WorkspaceRoleMetaKey,
                handler
            );
            expect(
                workspaceMemberService.validateWorkspaceGuard
            ).toHaveBeenCalledTimes(1);
            expect(
                workspaceMemberService.validateWorkspaceGuard
            ).toHaveBeenCalledWith('workspace-1', 'user-1', [
                EnumWorkspaceMemberRole.admin,
            ]);
            expect(requestStoreService.merge).toHaveBeenCalledWith(
                WorkspaceContextStoreKey,
                workspaceContext
            );
        });

        it('validates with a null id and an empty role list when the store holds no id and the route sets no roles', async () => {
            const store: Record<string, unknown> = {
                [UserContextStoreKey]: userContext,
            };
            requestStoreService.get.mockImplementation(
                key => store[key] ?? null
            );
            reflector.get.mockReturnValue(undefined);
            workspaceMemberService.validateWorkspaceGuard.mockResolvedValue(
                workspaceContext
            );

            await guard.canActivate(executionContext);

            expect(
                workspaceMemberService.validateWorkspaceGuard
            ).toHaveBeenCalledWith(null, 'user-1', []);
        });

        it('throws UserGuardMissingException before the domain call when the store holds no user context', async () => {
            requestStoreService.get.mockReturnValue(null);

            await expect(
                guard.canActivate(executionContext)
            ).rejects.toMatchObject({
                module: 'user',
                statusCode: EnumUserStatusCodeError.guardMissing,
            });
            expect(
                workspaceMemberService.validateWorkspaceGuard
            ).not.toHaveBeenCalled();
            expect(requestStoreService.merge).not.toHaveBeenCalled();
        });
    });
});
