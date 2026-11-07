import { Test } from '@nestjs/testing';
import type { TestingModule } from '@nestjs/testing';
import { mock } from 'vitest-mock-extended';
import type { MockProxy } from 'vitest-mock-extended';
import {
    EnumActivityLogAction,
    EnumProjectMemberRole,
} from '@generated/prisma-client/client';
import type { Project, ProjectMember } from '@generated/prisma-client/client';
import { ActivityLogService } from '@modules/activity-log/services/activity-log.service';
import type {
    IActivityLogStaged,
    IActivityLogStageInput,
} from '@modules/activity-log/interfaces/activity-log.interface';
import { ProjectMemberService } from '@modules/project/services/project.member.service';
import { ProjectLeaveUseCase } from '@modules/project/use-cases/project.leave.use-case';

describe('ProjectLeaveUseCase', () => {
    const projectMemberService: MockProxy<ProjectMemberService> =
        mock<ProjectMemberService>();

    const activityLogService: MockProxy<ActivityLogService> =
        mock<ActivityLogService>();

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
        activityLogService.prepare.mockImplementation(
            <A extends EnumActivityLogAction>(
                input: IActivityLogStageInput<A>
            ): IActivityLogStaged => ({
                userId: null,
                createdBy: null,
                workspaceId: null,
                ...input,
                metadata: input.metadata ?? {},
            })
        );

        const module: TestingModule = await Test.createTestingModule({
            providers: [
                ProjectLeaveUseCase,
                {
                    provide: ProjectMemberService,
                    useValue: projectMemberService,
                },
                { provide: ActivityLogService, useValue: activityLogService },
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

        it('delegates leaving the project to the domain', async () => {
            await useCase.execute(project, member);

            expect(projectMemberService.leaveProject).toHaveBeenCalledWith(
                member
            );
        });

        it('prepares the left activity log before the write and stages it after', async () => {
            projectMemberService.leaveProject.mockImplementation(async () => {
                expect(activityLogService.stagePrepared).not.toHaveBeenCalled();
            });

            await useCase.execute(project, member);

            expect(activityLogService.stagePrepared).toHaveBeenCalledWith([
                {
                    action: EnumActivityLogAction.projectMemberLeft,
                    userId: member.userId,
                    createdBy: member.userId,
                    workspaceId: project.workspaceId,
                    metadata: {},
                },
            ]);
        });
    });
});
