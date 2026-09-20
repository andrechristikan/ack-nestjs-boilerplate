import { createMock } from '@golevelup/ts-vitest';
import type { ExecutionContext } from '@nestjs/common';
import type { ConfigService } from '@nestjs/config';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { RequestStoreService } from '@common/request/services/request.store.service';
import { WorkspaceStoreKey } from '@modules/workspace/constants/workspace.constant';
import { WorkspaceDomain } from '@modules/workspace/domains/workspace.domain';
import { WorkspaceGuard } from '@modules/workspace/guards/workspace.guard';

describe('WorkspaceGuard', () => {
    const configService = createMock<ConfigService>();
    const workspaceDomain = createMock<WorkspaceDomain>();
    const requestStoreService = createMock<RequestStoreService>();
    const context = createMock<ExecutionContext>();

    beforeEach(() => vi.resetAllMocks());

    it('resolves and stores the active workspace', async () => {
        const workspace =
            createMock<
                Awaited<ReturnType<WorkspaceDomain['validateWorkspaceGuard']>>
            >();
        configService.get.mockReturnValue('workspace-header');
        requestStoreService.get.mockReturnValue('workspace-id');
        workspaceDomain.validateWorkspaceGuard.mockResolvedValue(workspace);
        const guard = new WorkspaceGuard(
            configService,
            workspaceDomain,
            requestStoreService
        );

        await expect(guard.canActivate(context)).resolves.toBe(true);
        expect(workspaceDomain.validateWorkspaceGuard).toHaveBeenCalledWith(
            'workspace-id'
        );
        expect(requestStoreService.set).toHaveBeenCalledWith(
            WorkspaceStoreKey,
            workspace
        );
    });

    it('reads the workspace id from the store key configured under workspace.storeKey', async () => {
        configService.get.mockImplementation(key =>
            key === 'workspace.storeKey' ? 'custom-workspace-key' : undefined
        );
        requestStoreService.get.mockReturnValue('workspace-id');
        workspaceDomain.validateWorkspaceGuard.mockResolvedValue(
            createMock<
                Awaited<ReturnType<WorkspaceDomain['validateWorkspaceGuard']>>
            >()
        );
        const guard = new WorkspaceGuard(
            configService,
            workspaceDomain,
            requestStoreService
        );

        await expect(guard.canActivate(context)).resolves.toBe(true);

        expect(requestStoreService.get).toHaveBeenCalledWith(
            'custom-workspace-key'
        );
        expect(workspaceDomain.validateWorkspaceGuard).toHaveBeenCalledWith(
            'workspace-id'
        );
    });

    it('hands undefined to the domain when no workspace id is stored', async () => {
        configService.get.mockReturnValue('workspace-header');
        requestStoreService.get.mockReturnValue(undefined);
        workspaceDomain.validateWorkspaceGuard.mockResolvedValue(
            createMock<
                Awaited<ReturnType<WorkspaceDomain['validateWorkspaceGuard']>>
            >()
        );
        const guard = new WorkspaceGuard(
            configService,
            workspaceDomain,
            requestStoreService
        );

        await expect(guard.canActivate(context)).resolves.toBe(true);

        expect(workspaceDomain.validateWorkspaceGuard).toHaveBeenCalledWith(
            undefined
        );
    });

    it('propagates the domain rejection unchanged and publishes nothing', async () => {
        const error = new Error('workspace not found');
        configService.get.mockReturnValue('workspace-header');
        requestStoreService.get.mockReturnValue('workspace-id');
        workspaceDomain.validateWorkspaceGuard.mockRejectedValue(error);
        const guard = new WorkspaceGuard(
            configService,
            workspaceDomain,
            requestStoreService
        );

        await expect(guard.canActivate(context)).rejects.toBe(error);
        expect(requestStoreService.set).not.toHaveBeenCalled();
    });
});
