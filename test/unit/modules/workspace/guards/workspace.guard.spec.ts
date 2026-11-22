import { Test } from '@nestjs/testing';
import type { TestingModule } from '@nestjs/testing';
import type { ExecutionContext } from '@nestjs/common';
import { mock } from 'vitest-mock-extended';
import type { MockProxy } from 'vitest-mock-extended';
import type { Workspace } from '@generated/prisma-client/client';
import {
    WorkspaceContextStoreKey,
    WorkspaceIdStoreKey,
} from '@modules/workspace/constants/workspace.constant';
import { RequestStoreService } from '@common/request/services/request.store.service';
import { WorkspaceService } from '@modules/workspace/services/workspace.service';
import { WorkspaceGuard } from '@modules/workspace/guards/workspace.guard';

describe('WorkspaceGuard', () => {
    const workspaceService: MockProxy<WorkspaceService> =
        mock<WorkspaceService>();
    const requestStoreService: MockProxy<RequestStoreService> =
        mock<RequestStoreService>();
    const executionContext: MockProxy<ExecutionContext> =
        mock<ExecutionContext>();

    const workspace: Workspace = {
        id: 'workspace-1',
        createdAt: new Date('2026-01-01T00:00:00.000Z'),
        createdBy: null,
        updatedAt: new Date('2026-01-01T00:00:00.000Z'),
        updatedBy: null,
        deletedAt: null,
        deletedBy: null,
        name: 'Acme',
        slug: 'acme-team',
        description: null,
        isPublic: false,
    };

    let guard: WorkspaceGuard;

    beforeEach(async () => {
        vi.resetAllMocks();

        const module: TestingModule = await Test.createTestingModule({
            providers: [
                WorkspaceGuard,
                { provide: WorkspaceService, useValue: workspaceService },
                { provide: RequestStoreService, useValue: requestStoreService },
            ],
        }).compile();

        guard = module.get(WorkspaceGuard);
    });

    describe('canActivate', () => {
        it('resolves the workspace by the stored id and merges it into the workspace context', async () => {
            requestStoreService.get.mockReturnValue('workspace-1');
            workspaceService.validateWorkspaceGuard.mockResolvedValue(
                workspace
            );

            const result = await guard.canActivate(executionContext);

            expect(result).toBe(true);
            expect(requestStoreService.get).toHaveBeenCalledWith(
                WorkspaceIdStoreKey
            );
            expect(
                workspaceService.validateWorkspaceGuard
            ).toHaveBeenCalledWith('workspace-1');
            expect(requestStoreService.merge).toHaveBeenCalledWith(
                WorkspaceContextStoreKey,
                { workspaceId: 'workspace-1', workspace }
            );
        });

        it('validates with a null id when the store holds none', async () => {
            requestStoreService.get.mockReturnValue(null);
            workspaceService.validateWorkspaceGuard.mockResolvedValue(
                workspace
            );

            await guard.canActivate(executionContext);

            expect(
                workspaceService.validateWorkspaceGuard
            ).toHaveBeenCalledWith(null);
        });
    });
});
