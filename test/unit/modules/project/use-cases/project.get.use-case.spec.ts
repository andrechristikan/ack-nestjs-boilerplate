import { Test } from '@nestjs/testing';
import type { TestingModule } from '@nestjs/testing';
import type { Project } from '@generated/prisma-client/client';
import { ProjectGetUseCase } from '@modules/project/use-cases/project.get.use-case';
import {
    buildRequestContextProject,
    buildUser,
    buildWorkspace,
    buildWorkspaceMember,
} from '@test/unit/helpers/test.unit.request.helper';

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

    const context = buildRequestContextProject(
        buildUser('user-1', 'jane@example.com'),
        { ...buildWorkspace(), id: project.workspaceId },
        buildWorkspaceMember('user-1'),
        project
    );

    beforeEach(async () => {
        vi.resetAllMocks();

        const module: TestingModule = await Test.createTestingModule({
            providers: [ProjectGetUseCase],
        }).compile();

        useCase = module.get(ProjectGetUseCase);
    });

    describe('execute', () => {
        it('wraps the current project in the response envelope', async () => {
            const result = await useCase.execute(context);

            expect(result).toEqual({ data: project });
        });
    });
});
