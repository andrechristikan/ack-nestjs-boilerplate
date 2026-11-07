import { Test } from '@nestjs/testing';
import type { TestingModule } from '@nestjs/testing';
import type { Project } from '@generated/prisma-client/client';
import { ProjectGetUseCase } from '@modules/project/use-cases/project.get.use-case';

describe('ProjectGetUseCase', () => {
    let useCase: ProjectGetUseCase;

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
            providers: [ProjectGetUseCase],
        }).compile();

        useCase = module.get(ProjectGetUseCase);
    });

    describe('execute', () => {
        it('wraps the current project in the response envelope', async () => {
            const result = await useCase.execute(project);

            expect(result).toEqual({ data: project });
        });
    });
});
