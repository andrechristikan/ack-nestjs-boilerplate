import { Test } from '@nestjs/testing';
import type { TestingModule } from '@nestjs/testing';
import { mock } from 'vitest-mock-extended';
import type { MockProxy } from 'vitest-mock-extended';
import type { Workspace } from '@generated/prisma-client/client';
import { WorkspaceService } from '@modules/workspace/services/workspace.service';
import { WorkspacePreviewUseCase } from '@modules/workspace/use-cases/workspace.preview.use-case';
import { buildWorkspace } from '@test/unit/helpers/test.unit.request.helper';

describe('WorkspacePreviewUseCase', () => {
    const workspaceService: MockProxy<WorkspaceService> =
        mock<WorkspaceService>();
    const workspace: Workspace = buildWorkspace();
    let useCase: WorkspacePreviewUseCase;

    beforeEach(async () => {
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
