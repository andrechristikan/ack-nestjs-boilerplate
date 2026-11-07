import { Test } from '@nestjs/testing';
import type { TestingModule } from '@nestjs/testing';
import { mock } from 'vitest-mock-extended';
import type { MockProxy } from 'vitest-mock-extended';
import { EnumActivityLogAction } from '@generated/prisma-client/client';
import type { Project } from '@generated/prisma-client/client';
import type { ProjectCreateRequestDto } from '@modules/project/dtos/request/project.create.request.dto';
import { ActivityLogService } from '@modules/activity-log/services/activity-log.service';
import type { IActivityLogStaged } from '@modules/activity-log/interfaces/activity-log.interface';
import { ProjectService } from '@modules/project/services/project.service';
import { ProjectCreateUseCase } from '@modules/project/use-cases/project.create.use-case';

describe('ProjectCreateUseCase', () => {
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
        activityLogService.prepare.mockReturnValue(stagedActivityLog);

        const module: TestingModule = await Test.createTestingModule({
            providers: [
                ProjectCreateUseCase,
                { provide: ProjectService, useValue: projectService },
                { provide: ActivityLogService, useValue: activityLogService },
            ],
        }).compile();

        useCase = module.get(ProjectCreateUseCase);
    });

    describe('execute', () => {
        it('creates the project and wraps it in the response envelope', async () => {
            const body: ProjectCreateRequestDto = {
                name: 'Website Revamp',
                description: 'Marketing site redesign',
            };
            projectService.createProject.mockResolvedValue(project);

            const result = await useCase.execute(
                '507f1f77bcf86cd799439012',
                '507f1f77bcf86cd799439015',
                body
            );

            expect(result).toEqual({ data: project });
            expect(projectService.createProject).toHaveBeenCalledWith(
                '507f1f77bcf86cd799439012',
                {
                    name: 'Website Revamp',
                    description: 'Marketing site redesign',
                }
            );
        });

        it('prepares the created activity log before the write and stages it after', async () => {
            const body: ProjectCreateRequestDto = { name: 'Website Revamp' };
            projectService.createProject.mockImplementation(async () => {
                expect(activityLogService.prepare).toHaveBeenCalledWith({
                    action: EnumActivityLogAction.projectCreated,
                    userId: '507f1f77bcf86cd799439015',
                    createdBy: '507f1f77bcf86cd799439015',
                    workspaceId: '507f1f77bcf86cd799439012',
                });
                expect(activityLogService.stagePrepared).not.toHaveBeenCalled();

                return project;
            });

            await useCase.execute(
                '507f1f77bcf86cd799439012',
                '507f1f77bcf86cd799439015',
                body
            );

            expect(activityLogService.stagePrepared).toHaveBeenCalledWith([
                stagedActivityLog,
            ]);
        });

        it('stages nothing when the domain throws', async () => {
            const body: ProjectCreateRequestDto = { name: 'Website Revamp' };
            projectService.createProject.mockRejectedValue(new Error('boom'));

            await expect(
                useCase.execute(
                    '507f1f77bcf86cd799439012',
                    '507f1f77bcf86cd799439015',
                    body
                )
            ).rejects.toThrow('boom');
            expect(activityLogService.stagePrepared).not.toHaveBeenCalled();
        });

        it('passes null for an omitted description', async () => {
            const body: ProjectCreateRequestDto = { name: 'Website Revamp' };
            projectService.createProject.mockResolvedValue(project);

            await useCase.execute(
                '507f1f77bcf86cd799439012',
                '507f1f77bcf86cd799439015',
                body
            );

            expect(projectService.createProject).toHaveBeenCalledWith(
                '507f1f77bcf86cd799439012',
                { name: 'Website Revamp', description: null }
            );
        });
    });
});
