import { Test } from '@nestjs/testing';
import type { TestingModule } from '@nestjs/testing';
import { mock } from 'vitest-mock-extended';
import type { MockProxy } from 'vitest-mock-extended';
import type { Project } from '@generated/prisma-client/client';
import type { ProjectUpdateSlugRequestDto } from '@modules/project/dtos/request/project.update-slug.request.dto';
import { ProjectService } from '@modules/project/services/project.service';
import { ProjectUpdateSlugUseCase } from '@modules/project/use-cases/project.update-slug.use-case';
import { buildRequestContext } from '@test/unit/helpers/test.unit.request.helper';

describe('ProjectUpdateSlugUseCase', () => {
    const projectService: MockProxy<ProjectService> = mock<ProjectService>();

    const context = buildRequestContext('507f1f77bcf86cd799439015');

    let useCase: ProjectUpdateSlugUseCase;

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
                ProjectUpdateSlugUseCase,
                { provide: ProjectService, useValue: projectService },
            ],
        }).compile();

        useCase = module.get(ProjectUpdateSlugUseCase);
    });

    describe('execute', () => {
        it('updates the slug with the actor and the context and wraps it in the response envelope', async () => {
            const body: ProjectUpdateSlugRequestDto = { slug: 'p-new-slug' };
            const updated = { ...project, slug: 'p-new-slug' };
            projectService.updateProjectSlug.mockResolvedValue(updated);

            const result = await useCase.execute(
                project,
                '507f1f77bcf86cd799439015',
                body,
                context
            );

            expect(result).toEqual({ data: updated });
            expect(projectService.updateProjectSlug).toHaveBeenCalledWith(
                project,
                '507f1f77bcf86cd799439015',
                'p-new-slug',
                context
            );
        });

        it('rejects with the domain failure', async () => {
            projectService.updateProjectSlug.mockRejectedValue(
                new Error('boom')
            );

            await expect(
                useCase.execute(
                    project,
                    '507f1f77bcf86cd799439015',
                    { slug: 'p-new-slug' },
                    context
                )
            ).rejects.toThrow('boom');
        });
    });
});
