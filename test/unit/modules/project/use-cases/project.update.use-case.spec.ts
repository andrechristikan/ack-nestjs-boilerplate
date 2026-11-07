import { Test } from '@nestjs/testing';
import type { TestingModule } from '@nestjs/testing';
import { mock } from 'vitest-mock-extended';
import type { MockProxy } from 'vitest-mock-extended';
import { EnumActivityLogAction } from '@generated/prisma-client/client';
import type { Project } from '@generated/prisma-client/client';
import type { ProjectUpdateRequestDto } from '@modules/project/dtos/request/project.update.request.dto';
import { ActivityLogService } from '@modules/activity-log/services/activity-log.service';
import type { IActivityLogStaged } from '@modules/activity-log/interfaces/activity-log.interface';
import { ProjectService } from '@modules/project/services/project.service';
import { ProjectUpdateUseCase } from '@modules/project/use-cases/project.update.use-case';

describe('ProjectUpdateUseCase', () => {
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

    beforeEach(async () => {
        vi.resetAllMocks();
        activityLogService.prepare.mockReturnValue(stagedActivityLog);

        const module: TestingModule = await Test.createTestingModule({
            providers: [
                ProjectUpdateUseCase,
                { provide: ProjectService, useValue: projectService },
                { provide: ActivityLogService, useValue: activityLogService },
            ],
        }).compile();

        useCase = module.get(ProjectUpdateUseCase);
    });

    describe('execute', () => {
        it('updates the project and wraps it in the response envelope', async () => {
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
                project,
                '507f1f77bcf86cd799439015',
                body
            );

            expect(result).toEqual({ data: updated });
            expect(projectService.updateProject).toHaveBeenCalledWith(project, {
                name: 'New Name',
                description: 'New description',
            });
        });

        it('prepares the updated activity log before the write and stages it after', async () => {
            const body: ProjectUpdateRequestDto = {
                name: 'New Name',
                description: null,
            };
            projectService.updateProject.mockImplementation(async () => {
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

        it('passes a null description through to clear it', async () => {
            const body: ProjectUpdateRequestDto = {
                name: 'New Name',
                description: null,
            };
            const updated = { ...project, name: 'New Name', description: null };
            projectService.updateProject.mockResolvedValue(updated);

            await useCase.execute(project, '507f1f77bcf86cd799439015', body);

            expect(projectService.updateProject).toHaveBeenCalledWith(project, {
                name: 'New Name',
                description: null,
            });
        });
    });
});
