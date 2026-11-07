import { Test } from '@nestjs/testing';
import type { TestingModule } from '@nestjs/testing';
import type { Workspace } from '@generated/prisma-client/client';
import { WorkspaceGetCurrentUseCase } from '@modules/workspace/use-cases/workspace.get-current.use-case';

describe('WorkspaceGetCurrentUseCase', () => {
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
    let useCase: WorkspaceGetCurrentUseCase;

    beforeEach(async () => {
        vi.resetAllMocks();

        const module: TestingModule = await Test.createTestingModule({
            providers: [WorkspaceGetCurrentUseCase],
        }).compile();

        useCase = module.get(WorkspaceGetCurrentUseCase);
    });

    describe('execute', () => {
        it('wraps the current workspace in the response envelope', async () => {
            const result = await useCase.execute(workspace);

            expect(result).toEqual({ data: workspace });
        });
    });
});
