import { Test } from '@nestjs/testing';
import type { TestingModule } from '@nestjs/testing';
import type { Workspace } from '@generated/prisma-client/client';
import { WorkspaceGetCurrentUseCase } from '@modules/workspace/use-cases/workspace.get-current.use-case';
import {
    buildWorkspace,
    buildWorkspaceContext,
    buildWorkspaceMember,
} from '@test/unit/helpers/test.unit.request.helper';

describe('WorkspaceGetCurrentUseCase', () => {
    const workspace: Workspace = buildWorkspace();
    const workspaceContext = buildWorkspaceContext(
        workspace,
        buildWorkspaceMember('user-1')
    );
    let useCase: WorkspaceGetCurrentUseCase;

    beforeEach(async () => {
        const module: TestingModule = await Test.createTestingModule({
            providers: [WorkspaceGetCurrentUseCase],
        }).compile();

        useCase = module.get(WorkspaceGetCurrentUseCase);
    });

    describe('execute', () => {
        it('wraps the current workspace in the response envelope', async () => {
            const result = await useCase.execute(workspaceContext);

            expect(result).toEqual({ data: workspace });
        });
    });
});
