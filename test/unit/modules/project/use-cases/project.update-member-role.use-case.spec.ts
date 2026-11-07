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
import type { ProjectMemberUpdateRoleRequestDto } from '@modules/project/dtos/request/project.member-update-role.request.dto';
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
import { ProjectUpdateMemberRoleUseCase } from '@modules/project/use-cases/project.update-member-role.use-case';

describe('ProjectUpdateMemberRoleUseCase', () => {
    const projectMemberService: MockProxy<ProjectMemberService> =
        mock<ProjectMemberService>();

    const activityLogService: MockProxy<ActivityLogService> =
        mock<ActivityLogService>();

    const projectUtil: MockProxy<ProjectUtil> = mock<ProjectUtil>();

    let useCase: ProjectUpdateMemberRoleUseCase;

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
                ProjectUpdateMemberRoleUseCase,
                {
                    provide: ProjectMemberService,
                    useValue: projectMemberService,
                },
                { provide: ProjectUtil, useValue: projectUtil },
                { provide: ActivityLogService, useValue: activityLogService },
            ],
        }).compile();

        useCase = module.get(ProjectUpdateMemberRoleUseCase);
    });

    describe('execute', () => {
        it('delegates the role update to the domain', async () => {
            const body: ProjectMemberUpdateRoleRequestDto = {
                role: EnumProjectMemberRole.admin,
            };
            projectMemberService.updateMemberRole.mockResolvedValue(
                projectMemberRow
            );

            await useCase.execute(
                project,
                actorMember,
                '507f1f77bcf86cd799439021',
                body
            );

            expect(projectUtil.mapMemberActor).toHaveBeenCalledWith(
                actorMember
            );
            expect(projectMemberService.updateMemberRole).toHaveBeenCalledWith(
                project,
                actor,
                '507f1f77bcf86cd799439021',
                body.role
            );
        });

        it('stages both role-updated activity logs from the changed member when the actor differs from it', async () => {
            const actorId = '507f1f77bcf86cd799439033';
            const body: ProjectMemberUpdateRoleRequestDto = {
                role: EnumProjectMemberRole.admin,
            };
            projectMemberService.updateMemberRole.mockResolvedValue(
                projectMemberRow
            );

            await useCase.execute(
                project,
                actorMember,
                projectMemberRow.id,
                body
            );

            expect(activityLogService.stagePrepared).toHaveBeenCalledWith([
                {
                    action: EnumActivityLogAction.projectMemberRoleUpdated,
                    userId: actorId,
                    createdBy: actorId,
                    workspaceId: project.workspaceId,
                    metadata: { targetUserId: projectMemberRow.userId },
                },
                {
                    action: EnumActivityLogAction.projectMemberRoleUpdatedByAdmin,
                    userId: projectMemberRow.userId,
                    createdBy: actorId,
                    workspaceId: project.workspaceId,
                    metadata: { actorUserId: actorId },
                },
            ]);
        });

        it('stages one role-updated activity log when the actor updates their own role', async () => {
            const body: ProjectMemberUpdateRoleRequestDto = {
                role: EnumProjectMemberRole.admin,
            };
            projectMemberService.updateMemberRole.mockResolvedValue(
                projectMemberRow
            );

            projectUtil.mapMemberActor.mockReturnValue({
                userId: projectMemberRow.userId,
                hasWorkspaceBypass: true,
            });

            await useCase.execute(
                project,
                { ...actorMember, userId: projectMemberRow.userId },
                projectMemberRow.id,
                body
            );

            expect(activityLogService.stagePrepared).toHaveBeenCalledWith([
                {
                    action: EnumActivityLogAction.projectMemberRoleUpdated,
                    userId: projectMemberRow.userId,
                    createdBy: projectMemberRow.userId,
                    workspaceId: project.workspaceId,
                    metadata: { targetUserId: projectMemberRow.userId },
                },
            ]);
        });
    });
});
