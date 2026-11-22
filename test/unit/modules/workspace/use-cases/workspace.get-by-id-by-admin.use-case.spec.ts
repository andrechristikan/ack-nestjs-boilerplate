import { Test } from '@nestjs/testing';
import type { TestingModule } from '@nestjs/testing';
import { mock } from 'vitest-mock-extended';
import type { MockProxy } from 'vitest-mock-extended';
import type { Workspace } from '@generated/prisma-client/client';
import { WorkspaceService } from '@modules/workspace/services/workspace.service';
import { WorkspaceGetByIdByAdminUseCase } from '@modules/workspace/use-cases/workspace.get-by-id-by-admin.use-case';

describe('WorkspaceGetByIdByAdminUseCase', () => {
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
    let useCase: WorkspaceGetByIdByAdminUseCase;

    beforeEach(async () => {
        vi.resetAllMocks();

        const module: TestingModule = await Test.createTestingModule({
            providers: [
                WorkspaceGetByIdByAdminUseCase,
                { provide: WorkspaceService, useValue: workspaceService },
            ],
        }).compile();

        useCase = module.get(WorkspaceGetByIdByAdminUseCase);
    });

    describe('execute', () => {
        it('wraps the workspace resolved for admin', async () => {
            workspaceService.getByIdByAdmin.mockResolvedValue(workspace);

            const result = await useCase.execute('workspace-1');

            expect(result).toEqual({ data: workspace });
            expect(workspaceService.getByIdByAdmin).toHaveBeenCalledWith(
                'workspace-1'
            );
        });
    });
});
