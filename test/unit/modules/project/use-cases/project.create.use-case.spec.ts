import { Test } from '@nestjs/testing';
import type { TestingModule } from '@nestjs/testing';
import { mock } from 'vitest-mock-extended';
import type { MockProxy } from 'vitest-mock-extended';
import type { Project } from '@generated/prisma-client/client';
import type { ProjectCreateRequestDto } from '@modules/project/dtos/request/project.create.request.dto';
import { ProjectService } from '@modules/project/services/project.service';
import { ProjectCreateUseCase } from '@modules/project/use-cases/project.create.use-case';
import { buildRequestContext } from '@test/unit/helpers/test.unit.request.helper';

describe('ProjectCreateUseCase', () => {
    const projectService: MockProxy<ProjectService> = mock<ProjectService>();

    const context = buildRequestContext('507f1f77bcf86cd799439015');

    let useCase: ProjectCreateUseCase;

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

    beforeEach(async () => {
        vi.resetAllMocks();

        const module: TestingModule = await Test.createTestingModule({
            providers: [
                ProjectCreateUseCase,
                { provide: ProjectService, useValue: projectService },
            ],
        }).compile();

        useCase = module.get(ProjectCreateUseCase);
    });

    describe('execute', () => {
        it('creates the project with the actor and the context and wraps it in the response envelope', async () => {
            const body: ProjectCreateRequestDto = {
                name: 'Website Revamp',
                description: 'Marketing site redesign',
            };
            projectService.createProject.mockResolvedValue(project);

            const result = await useCase.execute(
                '507f1f77bcf86cd799439012',
                '507f1f77bcf86cd799439015',
                body,
                context
            );

            expect(result).toEqual({ data: project });
            expect(projectService.createProject).toHaveBeenCalledWith(
                '507f1f77bcf86cd799439012',
                '507f1f77bcf86cd799439015',
                {
                    name: 'Website Revamp',
                    description: 'Marketing site redesign',
                },
                context
            );
        });

        it('rejects with the domain failure', async () => {
            const body: ProjectCreateRequestDto = { name: 'Website Revamp' };
            projectService.createProject.mockRejectedValue(new Error('boom'));

            await expect(
                useCase.execute(
                    '507f1f77bcf86cd799439012',
                    '507f1f77bcf86cd799439015',
                    body,
                    context
                )
            ).rejects.toThrow('boom');
        });

        it('passes null for an omitted description', async () => {
            const body: ProjectCreateRequestDto = { name: 'Website Revamp' };
            projectService.createProject.mockResolvedValue(project);

            await useCase.execute(
                '507f1f77bcf86cd799439012',
                '507f1f77bcf86cd799439015',
                body,
                context
            );

            expect(projectService.createProject).toHaveBeenCalledWith(
                '507f1f77bcf86cd799439012',
                '507f1f77bcf86cd799439015',
                { name: 'Website Revamp', description: null },
                context
            );
        });
    });
});
