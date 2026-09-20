import type { ExecutionContext } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Test } from '@nestjs/testing';
import type { TestingModule } from '@nestjs/testing';
import { mock } from 'vitest-mock-extended';
import type { MockProxy } from 'vitest-mock-extended';

import { RequestStoreService } from '@common/request/services/request.store.service';
import type { Workspace } from '@generated/prisma-client';
import { WorkspaceStoreKey } from '@modules/workspace/constants/workspace.constant';
import { WorkspaceDomain } from '@modules/workspace/domains/workspace.domain';
import { WorkspaceGuard } from '@modules/workspace/guards/workspace.guard';

describe('WorkspaceGuard', () => {
    const configService: MockProxy<ConfigService> = mock<ConfigService>();
    const workspaceDomain: MockProxy<WorkspaceDomain> = mock<WorkspaceDomain>();
    const requestStoreService: MockProxy<RequestStoreService> =
        mock<RequestStoreService>();
    const context: MockProxy<ExecutionContext> = mock<ExecutionContext>();
    const configGet = vi.mocked(configService.get);
    const now = new Date('2026-01-01T00:00:00.000Z');
    const workspace: Workspace = {
        id: 'workspace-id',
        name: 'Acme',
        slug: 'acme',
        description: null,
        isPublic: false,
        createdAt: now,
        createdBy: null,
        updatedAt: now,
        updatedBy: null,
        deletedAt: null,
        deletedBy: null,
    };
    let guard: WorkspaceGuard;

    const compile = async (): Promise<WorkspaceGuard> => {
        const module: TestingModule = await Test.createTestingModule({
            providers: [
                WorkspaceGuard,
                { provide: ConfigService, useValue: configService },
                { provide: WorkspaceDomain, useValue: workspaceDomain },
                {
                    provide: RequestStoreService,
                    useValue: requestStoreService,
                },
            ],
        }).compile();

        return module.get(WorkspaceGuard);
    };

    beforeEach(async () => {
        vi.resetAllMocks();
        configGet.mockReturnValue('workspace-header');
        guard = await compile();
    });

    it('resolves and stores the active workspace', async () => {
        requestStoreService.get.mockReturnValue('workspace-id');
        workspaceDomain.validateWorkspaceGuard.mockResolvedValue(workspace);

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
        configGet.mockImplementation((key: string) =>
            key === 'workspace.storeKey' ? 'custom-workspace-key' : undefined
        );
        requestStoreService.get.mockReturnValue('workspace-id');
        workspaceDomain.validateWorkspaceGuard.mockResolvedValue(workspace);
        guard = await compile();

        await expect(guard.canActivate(context)).resolves.toBe(true);

        expect(requestStoreService.get).toHaveBeenCalledWith(
            'custom-workspace-key'
        );
        expect(workspaceDomain.validateWorkspaceGuard).toHaveBeenCalledWith(
            'workspace-id'
        );
    });

    it('hands undefined to the domain when no workspace id is stored', async () => {
        requestStoreService.get.mockReturnValue(undefined);
        workspaceDomain.validateWorkspaceGuard.mockResolvedValue(workspace);

        await expect(guard.canActivate(context)).resolves.toBe(true);

        expect(workspaceDomain.validateWorkspaceGuard).toHaveBeenCalledWith(
            undefined
        );
    });

    it('propagates the domain rejection unchanged and publishes nothing', async () => {
        const error = new Error('workspace not found');
        requestStoreService.get.mockReturnValue('workspace-id');
        workspaceDomain.validateWorkspaceGuard.mockRejectedValue(error);

        await expect(guard.canActivate(context)).rejects.toBe(error);
        expect(requestStoreService.set).not.toHaveBeenCalled();
    });
});
