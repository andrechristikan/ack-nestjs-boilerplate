import { Test } from '@nestjs/testing';
import type { TestingModule } from '@nestjs/testing';
import { mock } from 'vitest-mock-extended';
import type { MockProxy } from 'vitest-mock-extended';
import type { Workspace } from '@generated/prisma-client/client';
import { WorkspaceService } from '@modules/workspace/services/workspace.service';
import { WorkspacePreviewUseCase } from '@modules/workspace/use-cases/workspace.preview.use-case';

describe('WorkspacePreviewUseCase', () => {
    const workspaceService: MockProxy<WorkspaceService> =
        mock<WorkspaceService>();
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
    let useCase: WorkspacePreviewUseCase;

    beforeEach(async () => {
        vi.resetAllMocks();

        const module: TestingModule = await Test.createTestingModule({
            providers: [
                WorkspacePreviewUseCase,
                { provide: WorkspaceService, useValue: workspaceService },
            ],
        }).compile();

        useCase = module.get(WorkspacePreviewUseCase);
    });

    describe('execute', () => {
        it('wraps the public workspace preview in the response envelope', async () => {
            workspaceService.previewWorkspace.mockResolvedValue(workspace);

            const result = await useCase.execute('acme-team');

            expect(result).toEqual({ data: workspace });
            expect(workspaceService.previewWorkspace).toHaveBeenCalledTimes(1);
            expect(workspaceService.previewWorkspace).toHaveBeenCalledWith(
                'acme-team'
            );
        });
    });
});
