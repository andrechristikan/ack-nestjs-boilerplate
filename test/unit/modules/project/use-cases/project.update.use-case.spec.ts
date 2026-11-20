import { Test } from '@nestjs/testing';
import type { TestingModule } from '@nestjs/testing';
import { mock } from 'vitest-mock-extended';
import type { MockProxy } from 'vitest-mock-extended';
import type { Project } from '@generated/prisma-client/client';
import type { ProjectUpdateRequestDto } from '@modules/project/dtos/request/project.update.request.dto';
import { ProjectService } from '@modules/project/services/project.service';
import { ProjectUpdateUseCase } from '@modules/project/use-cases/project.update.use-case';
import {
    buildUser,
    buildRequestContext,
    buildApiKeyContext,
    buildUserContext,
    buildAuthJwtAccessContext,
    buildProjectContext,
} from '@test/unit/helpers/test.unit.request.helper';

describe('ProjectUpdateUseCase', () => {
    const projectService: MockProxy<ProjectService> = mock<ProjectService>();

    let useCase: ProjectUpdateUseCase;

    const project: Project = {
        id: '507f1f77bcf86cd799439011',
        workspaceId: '507f1f77bcf86cd799439012',
        name: 'Website Revamp',
        slug: 'p-abc123',
        description: null,
        createdAt: new Date('2026-01-01T00:00:00.000Z'),
        createdBy: null,
        updatedAt: new Date('2026-01-01T00:00:00.000Z'),
        updatedBy: null,
        deletedAt: null,
        deletedBy: null,
    };

    const requestContext = buildRequestContext();
    const apiKeyContext = buildApiKeyContext();
    const userContext = buildUserContext(
        buildUser('507f1f77bcf86cd799439015', 'jane@example.com')
    );
    const authContext = buildAuthJwtAccessContext(userContext.user.id);
    const projectContext = buildProjectContext(project, null);

    beforeEach(async () => {
        const module: TestingModule = await Test.createTestingModule({
            providers: [
                ProjectUpdateUseCase,
                { provide: ProjectService, useValue: projectService },
            ],
        }).compile();

        useCase = module.get(ProjectUpdateUseCase);
    });

    describe('execute', () => {
        it('updates the project with the actor and the context and wraps it in the response envelope', async () => {
            const body: ProjectUpdateRequestDto = {
                name: 'New Name',
                description: 'New description',
            };
            const updated = {
                ...project,
                name: 'New Name',
                description: 'New description',
            };
            projectService.updateProject.mockResolvedValue(updated);

            const result = await useCase.execute(
                requestContext,
                apiKeyContext,
                authContext,
                projectContext,
                body
            );

            expect(result).toEqual({ data: updated });
            expect(projectService.updateProject).toHaveBeenCalledWith(
                requestContext,
                apiKeyContext,
                authContext,
                project,
                {
                    name: 'New Name',
                    description: 'New description',
                }
            );
        });

        it('passes a null description through to clear it', async () => {
            const body: ProjectUpdateRequestDto = {
                name: 'New Name',
                description: null,
            };
            projectService.updateProject.mockResolvedValue(project);

            await useCase.execute(
                requestContext,
                apiKeyContext,
                authContext,
                projectContext,
                body
            );

            expect(projectService.updateProject).toHaveBeenCalledWith(
                requestContext,
                apiKeyContext,
                authContext,
                project,
                { name: 'New Name', description: null }
            );
        });

        it('rejects with the domain failure', async () => {
            projectService.updateProject.mockRejectedValue(new Error('boom'));

            await expect(
                useCase.execute(
                    requestContext,
                    apiKeyContext,
                    authContext,
                    projectContext,
                    {
                        name: 'New Name',
                        description: null,
                    }
                )
            ).rejects.toThrow('boom');
        });
    });
});
