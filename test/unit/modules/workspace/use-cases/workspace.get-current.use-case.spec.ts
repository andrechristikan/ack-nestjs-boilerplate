import { Test } from '@nestjs/testing';
import type { TestingModule } from '@nestjs/testing';
import type { Workspace } from '@generated/prisma-client/client';
import { WorkspaceGetCurrentUseCase } from '@modules/workspace/use-cases/workspace.get-current.use-case';
import {
    buildRequestContextWorkspace,
    buildUser,
    buildWorkspaceMember,
} from '@test/unit/helpers/test.unit.request.helper';

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
    const context = buildRequestContextWorkspace(
        buildUser('user-1', 'jane@example.com'),
        workspace,
        buildWorkspaceMember('user-1')
    );
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
            const result = await useCase.execute(context);

            expect(result).toEqual({ data: workspace });
        });
    });
});
