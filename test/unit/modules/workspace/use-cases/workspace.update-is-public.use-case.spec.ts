import { Test } from '@nestjs/testing';
import type { TestingModule } from '@nestjs/testing';
import { mock } from 'vitest-mock-extended';
import type { MockProxy } from 'vitest-mock-extended';
import type { Workspace } from '@generated/prisma-client/client';
import type { WorkspaceUpdateIsPublicRequestDto } from '@modules/workspace/dtos/request/workspace.update-is-public.request.dto';
import { WorkspaceService } from '@modules/workspace/services/workspace.service';
import { WorkspaceUpdateIsPublicUseCase } from '@modules/workspace/use-cases/workspace.update-is-public.use-case';
import { buildRequestContext } from '@test/unit/helpers/test.unit.request.helper';

describe('WorkspaceUpdateIsPublicUseCase', () => {
    const workspaceService: MockProxy<WorkspaceService> =
        mock<WorkspaceService>();
    const context = buildRequestContext('user-1');
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
    let useCase: WorkspaceUpdateIsPublicUseCase;

    beforeEach(async () => {
        vi.resetAllMocks();

        const module: TestingModule = await Test.createTestingModule({
            providers: [
                WorkspaceUpdateIsPublicUseCase,
                { provide: WorkspaceService, useValue: workspaceService },
            ],
        }).compile();

        useCase = module.get(WorkspaceUpdateIsPublicUseCase);
    });

    describe('execute', () => {
        it('writes the visibility with the actor and the context and wraps the workspace', async () => {
            const body: WorkspaceUpdateIsPublicRequestDto = { isPublic: true };
            workspaceService.updateWorkspaceIsPublic.mockResolvedValue(
                workspace
            );

            const result = await useCase.execute(
                'workspace-1',
                'user-1',
                body,
                context
            );

            expect(result).toEqual({ data: workspace });
            expect(
                workspaceService.updateWorkspaceIsPublic
            ).toHaveBeenCalledWith('workspace-1', 'user-1', true, context);
        });
    });
});
