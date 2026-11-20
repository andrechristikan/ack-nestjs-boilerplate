import { Test } from '@nestjs/testing';
import type { TestingModule } from '@nestjs/testing';
import { mock } from 'vitest-mock-extended';
import type { MockProxy } from 'vitest-mock-extended';
import type { Workspace } from '@generated/prisma-client/client';
import { WorkspaceNotFoundException } from '@modules/workspace/exceptions/workspace.not-found.exception';
import type { WorkspaceUpdateRequestDto } from '@modules/workspace/dtos/request/workspace.update.request.dto';
import { WorkspaceService } from '@modules/workspace/services/workspace.service';
import { WorkspaceUpdateUseCase } from '@modules/workspace/use-cases/workspace.update.use-case';
import { EnumWorkspaceMemberRole } from '@generated/prisma-client/client';
import {
    buildApiKeyContext,
    buildAuthJwtAccessContext,
    buildRequestContext,
    buildUser,
    buildUserContext,
    buildWorkspace,
    buildWorkspaceContext,
    buildWorkspaceMember,
} from '@test/unit/helpers/test.unit.request.helper';

describe('WorkspaceUpdateUseCase', () => {
    const workspaceService: MockProxy<WorkspaceService> =
        mock<WorkspaceService>();
    const workspace: Workspace = buildWorkspace();
    const requestContext = buildRequestContext();
    const apiKeyContext = buildApiKeyContext();
    const userContext = buildUserContext(
        buildUser('user-1', 'jane@example.com')
    );
    const authContext = buildAuthJwtAccessContext(userContext.user.id);
    const workspaceContext = buildWorkspaceContext(
        workspace,
        buildWorkspaceMember('user-1', EnumWorkspaceMemberRole.owner)
    );
    let useCase: WorkspaceUpdateUseCase;

    beforeEach(async () => {
        const module: TestingModule = await Test.createTestingModule({
            providers: [
                WorkspaceUpdateUseCase,
                { provide: WorkspaceService, useValue: workspaceService },
            ],
        }).compile();

        useCase = module.get(WorkspaceUpdateUseCase);
    });

    describe('execute', () => {
        it('writes the details of the context workspace with the context context and wraps the workspace', async () => {
            const body: WorkspaceUpdateRequestDto = {
                name: 'Acme 2',
                description: 'Our team workspace',
            };
            workspaceService.updateWorkspace.mockResolvedValue(workspace);

            const result = await useCase.execute(
                requestContext,
                apiKeyContext,
                authContext,
                workspaceContext,
                body
            );

            expect(result).toEqual({ data: workspace });
            expect(workspaceService.updateWorkspace).toHaveBeenCalledWith(
                requestContext,
                apiKeyContext,
                authContext,
                'workspace-1',
                { name: 'Acme 2', description: 'Our team workspace' }
            );
        });

        it('passes a null description through to clear it', async () => {
            const body: WorkspaceUpdateRequestDto = {
                name: 'Acme 2',
                description: null,
            };
            workspaceService.updateWorkspace.mockResolvedValue(workspace);

            await useCase.execute(
                requestContext,
                apiKeyContext,
                authContext,
                workspaceContext,
                body
            );

            expect(workspaceService.updateWorkspace).toHaveBeenCalledWith(
                requestContext,
                apiKeyContext,
                authContext,
                'workspace-1',
                { name: 'Acme 2', description: null }
            );
        });

        it('rejects with the write failure', async () => {
            workspaceService.updateWorkspace.mockRejectedValue(
                new WorkspaceNotFoundException()
            );

            await expect(
                useCase.execute(
                    requestContext,
                    apiKeyContext,
                    authContext,
                    workspaceContext,
                    {
                        name: 'Acme 2',
                        description: null,
                    }
                )
            ).rejects.toBeInstanceOf(WorkspaceNotFoundException);
        });
    });
});
