import { Test } from '@nestjs/testing';
import type { TestingModule } from '@nestjs/testing';
import { mock } from 'vitest-mock-extended';
import type { MockProxy } from 'vitest-mock-extended';
import { EnumActivityLogAction } from '@generated/prisma-client/client';
import type { Project } from '@generated/prisma-client/client';
import type { ProjectUpdateSlugRequestDto } from '@modules/project/dtos/request/project.update-slug.request.dto';
import { ActivityLogService } from '@modules/activity-log/services/activity-log.service';
import type { IActivityLogStaged } from '@modules/activity-log/interfaces/activity-log.interface';
import { ProjectService } from '@modules/project/services/project.service';
import { ProjectUpdateSlugUseCase } from '@modules/project/use-cases/project.update-slug.use-case';

describe('ProjectUpdateSlugUseCase', () => {
    const projectService: MockProxy<ProjectService> = mock<ProjectService>();

    const activityLogService: MockProxy<ActivityLogService> =
        mock<ActivityLogService>();

    const stagedActivityLog: IActivityLogStaged = {
        action: EnumActivityLogAction.projectCreated,
        metadata: {},
        userId: '507f1f77bcf86cd799439015',
        createdBy: '507f1f77bcf86cd799439015',
        workspaceId: '507f1f77bcf86cd799439012',
    };

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
        activityLogService.prepare.mockReturnValue(stagedActivityLog);

        const module: TestingModule = await Test.createTestingModule({
            providers: [
                ProjectUpdateSlugUseCase,
                { provide: ProjectService, useValue: projectService },
                { provide: ActivityLogService, useValue: activityLogService },
            ],
        }).compile();

        useCase = module.get(ProjectUpdateSlugUseCase);
    });

    describe('execute', () => {
        it('updates the slug and wraps it in the response envelope', async () => {
            const body: ProjectUpdateSlugRequestDto = { slug: 'p-new-slug' };
            const updated = { ...project, slug: 'p-new-slug' };
            projectService.updateProjectSlug.mockResolvedValue(updated);

            const result = await useCase.execute(
                project,
                '507f1f77bcf86cd799439015',
                body
            );

            expect(result).toEqual({ data: updated });
            expect(projectService.updateProjectSlug).toHaveBeenCalledWith(
                project,
                'p-new-slug'
            );
        });

        it('prepares the updated activity log before the write and stages it after', async () => {
            const body: ProjectUpdateSlugRequestDto = { slug: 'p-new-slug' };
            projectService.updateProjectSlug.mockImplementation(async () => {
                expect(activityLogService.prepare).toHaveBeenCalledWith({
                    action: EnumActivityLogAction.projectUpdated,
                    userId: '507f1f77bcf86cd799439015',
                    createdBy: '507f1f77bcf86cd799439015',
                    workspaceId: project.workspaceId,
                });
                expect(activityLogService.stagePrepared).not.toHaveBeenCalled();

                return project;
            });

            await useCase.execute(project, '507f1f77bcf86cd799439015', body);

            expect(activityLogService.stagePrepared).toHaveBeenCalledWith([
                stagedActivityLog,
            ]);
        });
    });
});
