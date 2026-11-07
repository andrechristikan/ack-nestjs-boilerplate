import { Test } from '@nestjs/testing';
import type { TestingModule } from '@nestjs/testing';
import { mock } from 'vitest-mock-extended';
import type { MockProxy } from 'vitest-mock-extended';
import {
    EnumActivityLogAction,
    EnumProjectMemberRole,
    EnumWorkspaceMemberRole,
} from '@generated/prisma-client/client';
import type { Project, WorkspaceMember } from '@generated/prisma-client/client';
import { ActivityLogService } from '@modules/activity-log/services/activity-log.service';
import type {
    IActivityLogStaged,
    IActivityLogStageInput,
} from '@modules/activity-log/interfaces/activity-log.interface';
import { ProjectMemberService } from '@modules/project/services/project.member.service';
import type {
    IProjectMember,
    IProjectMemberActor,
} from '@modules/project/interfaces/project.interface';
import { ProjectUtil } from '@modules/project/utils/project.util';
import { ProjectRemoveMemberUseCase } from '@modules/project/use-cases/project.remove-member.use-case';

describe('ProjectRemoveMemberUseCase', () => {
    const projectMemberService: MockProxy<ProjectMemberService> =
        mock<ProjectMemberService>();

    const activityLogService: MockProxy<ActivityLogService> =
        mock<ActivityLogService>();

    const projectUtil: MockProxy<ProjectUtil> = mock<ProjectUtil>();

    let useCase: ProjectRemoveMemberUseCase;

    const actorMember: WorkspaceMember = {
        id: '507f1f77bcf86cd799439034',
        workspaceId: '507f1f77bcf86cd799439012',
        userId: '507f1f77bcf86cd799439033',
        role: EnumWorkspaceMemberRole.admin,
        joinedAt: new Date('2026-01-01T00:00:00.000Z'),
        createdAt: new Date('2026-01-01T00:00:00.000Z'),
        createdBy: null,
        updatedAt: new Date('2026-01-01T00:00:00.000Z'),
        updatedBy: null,
    };

    const actor: IProjectMemberActor = {
        userId: actorMember.userId,
        hasWorkspaceBypass: true,
    };

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

    const projectMemberRow: IProjectMember = {
        id: '507f1f77bcf86cd799439021',
        projectId: project.id,
        userId: '507f1f77bcf86cd799439022',
        role: EnumProjectMemberRole.member,
        joinedAt: new Date('2026-01-01T00:00:00.000Z'),
        createdAt: new Date('2026-01-01T00:00:00.000Z'),
        createdBy: null,
        updatedAt: new Date('2026-01-01T00:00:00.000Z'),
        updatedBy: null,
        user: {
            id: '507f1f77bcf86cd799439022',
            name: 'Jane Smith',
            username: 'meadowlark',
            photo: null,
            createdAt: new Date('2026-01-01T00:00:00.000Z'),
            createdBy: null,
            updatedAt: new Date('2026-01-01T00:00:00.000Z'),
            updatedBy: null,
            deletedAt: null,
            deletedBy: null,
        },
    };

    beforeEach(async () => {
        vi.resetAllMocks();
        projectUtil.mapMemberActor.mockReturnValue(actor);
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
                ProjectRemoveMemberUseCase,
                {
                    provide: ProjectMemberService,
                    useValue: projectMemberService,
                },
                { provide: ProjectUtil, useValue: projectUtil },
                { provide: ActivityLogService, useValue: activityLogService },
            ],
        }).compile();

        useCase = module.get(ProjectRemoveMemberUseCase);
    });

    describe('execute', () => {
        it('delegates the removal to the domain', async () => {
            projectMemberService.removeMember.mockResolvedValue(
                projectMemberRow
            );

            await useCase.execute(
                project,
                actorMember,
                '507f1f77bcf86cd799439021'
            );

            expect(projectUtil.mapMemberActor).toHaveBeenCalledWith(
                actorMember
            );
            expect(projectMemberService.removeMember).toHaveBeenCalledWith(
                project,
                actor,
                '507f1f77bcf86cd799439021'
            );
        });

        it('stages both removed activity logs from the removed member', async () => {
            const actorId = '507f1f77bcf86cd799439033';
            projectMemberService.removeMember.mockResolvedValue(
                projectMemberRow
            );

            await useCase.execute(project, actorMember, projectMemberRow.id);

            expect(activityLogService.stagePrepared).toHaveBeenCalledWith([
                {
                    action: EnumActivityLogAction.projectMemberRemoved,
                    userId: actorId,
                    createdBy: actorId,
                    workspaceId: project.workspaceId,
                    metadata: { targetUserId: projectMemberRow.userId },
                },
                {
                    action: EnumActivityLogAction.projectMemberRemovedByAdmin,
                    userId: projectMemberRow.userId,
                    createdBy: actorId,
                    workspaceId: project.workspaceId,
                    metadata: { actorUserId: actorId },
                },
            ]);
        });
    });
});
