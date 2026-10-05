import { Test } from '@nestjs/testing';
import type { TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import type { ExecutionContext } from '@nestjs/common';
import { mock } from 'vitest-mock-extended';
import type { MockProxy } from 'vitest-mock-extended';
import type { Workspace } from '@generated/prisma-client/client';
import { RequestStoreService } from '@common/request/services/request.store.service';
import { WorkspaceStoreKey } from '@modules/workspace/constants/workspace.constant';
import { WorkspaceDomain } from '@modules/workspace/domains/workspace.domain';
import { WorkspaceGuard } from '@modules/workspace/guards/workspace.guard';

describe('WorkspaceGuard', () => {
    const configGet = vi.fn<(key: string) => unknown>();
    const configService: MockProxy<ConfigService> = mock<ConfigService>({
        get: configGet as ConfigService['get'],
    });
    const workspaceDomain: MockProxy<WorkspaceDomain> = mock<WorkspaceDomain>();
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
        configGet.mockReturnValue('WorkspaceIdStore');

        const module: TestingModule = await Test.createTestingModule({
            providers: [
                WorkspaceGuard,
                { provide: ConfigService, useValue: configService },
                { provide: WorkspaceDomain, useValue: workspaceDomain },
                { provide: RequestStoreService, useValue: requestStoreService },
            ],
        }).compile();

        guard = module.get(WorkspaceGuard);
    });

    describe('canActivate', () => {
        it('reads the store key from config on construction', () => {
            expect(configGet).toHaveBeenCalledWith('workspace.storeKey');
        });

        it('resolves the workspace by the stored id and caches it', async () => {
            requestStoreService.get.mockReturnValue('workspace-1');
            workspaceDomain.validateWorkspaceGuard.mockResolvedValue(workspace);

            const result = await guard.canActivate(executionContext);

            expect(result).toBe(true);
            expect(workspaceDomain.validateWorkspaceGuard).toHaveBeenCalledWith(
                'workspace-1'
            );
            expect(requestStoreService.set).toHaveBeenCalledWith(
                WorkspaceStoreKey,
                workspace
            );
        });

        it('validates with a null id when the store has none', async () => {
            requestStoreService.get.mockReturnValue(null);
            workspaceDomain.validateWorkspaceGuard.mockResolvedValue(workspace);

            await guard.canActivate(executionContext);

            expect(workspaceDomain.validateWorkspaceGuard).toHaveBeenCalledWith(
                null
            );
        });
    });
});
