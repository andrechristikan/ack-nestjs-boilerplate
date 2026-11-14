import { Test } from '@nestjs/testing';
import type { TestingModule } from '@nestjs/testing';
import { mock } from 'vitest-mock-extended';
import type { MockProxy } from 'vitest-mock-extended';
import type { Workspace } from '@generated/prisma-client/client';
import { WorkspaceNotFoundException } from '@modules/workspace/exceptions/workspace.not-found.exception';
import type { WorkspaceUpdateSlugRequestDto } from '@modules/workspace/dtos/request/workspace.update-slug.request.dto';
import { WorkspaceService } from '@modules/workspace/services/workspace.service';
import { WorkspaceUpdateSlugUseCase } from '@modules/workspace/use-cases/workspace.update-slug.use-case';
import {
    buildUser,
    buildWorkspaceMember,
    buildRequestContext,
    buildApiKeyContext,
    buildUserContext,
    buildAuthJwtAccessContext,
    buildWorkspaceContext,
} from '@test/unit/helpers/test.unit.request.helper';

describe('WorkspaceUpdateSlugUseCase', () => {
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
    const requestContext = buildRequestContext();
    const apiKeyContext = buildApiKeyContext();
    const userContext = buildUserContext(
        buildUser('user-1', 'jane@example.com')
    );
    const authContext = buildAuthJwtAccessContext(userContext.user.id);
    const workspaceContext = buildWorkspaceContext(
        workspace,
        buildWorkspaceMember('user-1')
    );

    let useCase: WorkspaceUpdateSlugUseCase;

    beforeEach(async () => {
        vi.resetAllMocks();

        const module: TestingModule = await Test.createTestingModule({
            providers: [
                WorkspaceUpdateSlugUseCase,
                { provide: WorkspaceService, useValue: workspaceService },
            ],
        }).compile();

        useCase = module.get(WorkspaceUpdateSlugUseCase);
    });

    describe('execute', () => {
        it('writes the slug with the actor and the context and wraps the workspace', async () => {
            const body: WorkspaceUpdateSlugRequestDto = { slug: 'new-slug' };
            workspaceService.updateWorkspaceSlug.mockResolvedValue(workspace);

            const result = await useCase.execute(
                requestContext,
                apiKeyContext,
                authContext,
                workspaceContext,
                body
            );

            expect(result).toEqual({ data: workspace });
            expect(workspaceService.updateWorkspaceSlug).toHaveBeenCalledWith(
                requestContext,
                apiKeyContext,
                authContext,
                'workspace-1',
                'new-slug'
            );
        });

        it('rejects with the slug write failure', async () => {
            workspaceService.updateWorkspaceSlug.mockRejectedValue(
                new WorkspaceNotFoundException()
            );

            await expect(
                useCase.execute(
                    requestContext,
                    apiKeyContext,
                    authContext,
                    workspaceContext,
                    {
                        slug: 'new-slug',
                    }
                )
            ).rejects.toBeInstanceOf(WorkspaceNotFoundException);
        });
    });
});
