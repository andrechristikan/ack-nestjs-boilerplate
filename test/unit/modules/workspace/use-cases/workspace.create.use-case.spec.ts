import { Test } from '@nestjs/testing';
import type { TestingModule } from '@nestjs/testing';
import { mock } from 'vitest-mock-extended';
import type { MockProxy } from 'vitest-mock-extended';
import type { Workspace } from '@generated/prisma-client/client';
import { WorkspaceCapReachedException } from '@modules/workspace/exceptions/workspace.cap-reached.exception';
import type { WorkspaceCreateRequestDto } from '@modules/workspace/dtos/request/workspace.create.request.dto';
import { WorkspaceService } from '@modules/workspace/services/workspace.service';
import { WorkspaceCreateUseCase } from '@modules/workspace/use-cases/workspace.create.use-case';
import {
    buildUser,
    buildRequestContext,
    buildApiKeyContext,
    buildUserContext,
    buildAuthJwtAccessContext,
} from '@test/unit/helpers/test.unit.request.helper';

describe('WorkspaceCreateUseCase', () => {
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

    let useCase: WorkspaceCreateUseCase;

    beforeEach(async () => {
        vi.resetAllMocks();

        const module: TestingModule = await Test.createTestingModule({
            providers: [
                WorkspaceCreateUseCase,
                { provide: WorkspaceService, useValue: workspaceService },
            ],
        }).compile();

        useCase = module.get(WorkspaceCreateUseCase);
    });

    describe('execute', () => {
        it('creates the workspace with the context and wraps it in the response envelope', async () => {
            const body: WorkspaceCreateRequestDto = {
                name: 'Acme',
                description: 'Our team workspace',
                isPublic: true,
            };
            workspaceService.createWorkspace.mockResolvedValue(workspace);

            const result = await useCase.execute(
                requestContext,
                apiKeyContext,
                authContext,
                body
            );

            expect(result).toEqual({ data: workspace });
            expect(workspaceService.createWorkspace).toHaveBeenCalledWith(
                requestContext,
                apiKeyContext,
                authContext,
                {
                    name: 'Acme',
                    description: 'Our team workspace',
                    isPublic: true,
                }
            );
        });

        it('passes null for an omitted description and visibility', async () => {
            const body: WorkspaceCreateRequestDto = { name: 'Acme' };
            workspaceService.createWorkspace.mockResolvedValue(workspace);

            await useCase.execute(
                requestContext,
                apiKeyContext,
                authContext,
                body
            );

            expect(workspaceService.createWorkspace).toHaveBeenCalledWith(
                requestContext,
                apiKeyContext,
                authContext,
                { name: 'Acme', description: null, isPublic: null }
            );
        });

        it('rejects with the domain failure', async () => {
            workspaceService.createWorkspace.mockRejectedValue(
                new WorkspaceCapReachedException()
            );

            await expect(
                useCase.execute(requestContext, apiKeyContext, authContext, {
                    name: 'Acme',
                })
            ).rejects.toBeInstanceOf(WorkspaceCapReachedException);
        });
    });
});
