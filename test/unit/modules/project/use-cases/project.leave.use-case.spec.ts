import { Test } from '@nestjs/testing';
import type { TestingModule } from '@nestjs/testing';
import { mock } from 'vitest-mock-extended';
import type { MockProxy } from 'vitest-mock-extended';
import { EnumProjectMemberRole } from '@generated/prisma-client/client';
import type { Project, ProjectMember } from '@generated/prisma-client/client';
import { ProjectMemberService } from '@modules/project/services/project.member.service';
import { ProjectLeaveUseCase } from '@modules/project/use-cases/project.leave.use-case';
import { buildRequestContext } from '@test/unit/helpers/test.unit.request.helper';

describe('ProjectLeaveUseCase', () => {
    const projectMemberService: MockProxy<ProjectMemberService> =
        mock<ProjectMemberService>();

    const context = buildRequestContext('507f1f77bcf86cd799439033');

    let useCase: ProjectLeaveUseCase;

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
                ProjectLeaveUseCase,
                {
                    provide: ProjectMemberService,
                    useValue: projectMemberService,
                },
            ],
        }).compile();

        useCase = module.get(ProjectLeaveUseCase);
    });

    describe('execute', () => {
        const member: ProjectMember = {
            id: '507f1f77bcf86cd799439021',
            projectId: project.id,
            userId: '507f1f77bcf86cd799439022',
            role: EnumProjectMemberRole.member,
            joinedAt: new Date('2026-01-01T00:00:00.000Z'),
            createdAt: new Date('2026-01-01T00:00:00.000Z'),
            createdBy: null,
            updatedAt: new Date('2026-01-01T00:00:00.000Z'),
            updatedBy: null,
        };

        it('delegates leaving the project to the domain with the context', async () => {
            const result = await useCase.execute(project, member, context);

            expect(result).toEqual({});
            expect(projectMemberService.leaveProject).toHaveBeenCalledWith(
                project,
                member,
                context
            );
        });

        it('rejects with the domain failure', async () => {
            projectMemberService.leaveProject.mockRejectedValue(
                new Error('boom')
            );

            await expect(
                useCase.execute(project, member, context)
            ).rejects.toThrow('boom');
        });
    });
});
