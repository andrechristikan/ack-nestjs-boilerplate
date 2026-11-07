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
import type { ProjectMemberAssignRequestDto } from '@modules/project/dtos/request/project.member-assign.request.dto';
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
import { WorkspaceMemberService } from '@modules/workspace/services/workspace.member.service';
import { ProjectAssignMemberUseCase } from '@modules/project/use-cases/project.assign-member.use-case';

describe('ProjectAssignMemberUseCase', () => {
    const projectMemberService: MockProxy<ProjectMemberService> =
        mock<ProjectMemberService>();

    const workspaceMemberService: MockProxy<WorkspaceMemberService> =
        mock<WorkspaceMemberService>();

    const activityLogService: MockProxy<ActivityLogService> =
        mock<ActivityLogService>();

    const projectUtil: MockProxy<ProjectUtil> = mock<ProjectUtil>();

    let useCase: ProjectAssignMemberUseCase;

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
                ProjectAssignMemberUseCase,
                {
                    provide: ProjectMemberService,
                    useValue: projectMemberService,
                },
                {
                    provide: WorkspaceMemberService,
                    useValue: workspaceMemberService,
                },
                { provide: ProjectUtil, useValue: projectUtil },
                { provide: ActivityLogService, useValue: activityLogService },
            ],
        }).compile();

        useCase = module.get(ProjectAssignMemberUseCase);
    });

    describe('execute', () => {
        it('resolves the target workspace member and assigns them, wrapping the result', async () => {
            const body: ProjectMemberAssignRequestDto = {
                userId: '507f1f77bcf86cd799439022',
                role: EnumProjectMemberRole.member,
            };
            const targetMember: WorkspaceMember = {
                id: '507f1f77bcf86cd799439031',
                workspaceId: project.workspaceId,
                userId: body.userId,
                role: EnumWorkspaceMemberRole.member,
                joinedAt: new Date('2026-01-01T00:00:00.000Z'),
                createdAt: new Date('2026-01-01T00:00:00.000Z'),
                createdBy: null,
                updatedAt: new Date('2026-01-01T00:00:00.000Z'),
                updatedBy: null,
            };
            workspaceMemberService.getOneByWorkspaceAndUser.mockResolvedValue(
                targetMember
            );
            const created = { ...projectMemberRow, userId: body.userId };
            projectMemberService.assignMember.mockResolvedValue(created);

            const result = await useCase.execute(project, actorMember, body);

            expect(result).toEqual({ data: created });
            expect(
                workspaceMemberService.getOneByWorkspaceAndUser
            ).toHaveBeenCalledWith(project.workspaceId, body.userId);
            expect(projectUtil.mapMemberActor).toHaveBeenCalledWith(
                actorMember
            );
            expect(projectMemberService.assignMember).toHaveBeenCalledWith(
                project,
                actor,
                targetMember,
                body.role
            );
        });

        it('passes a null target member when the workspace holds none', async () => {
            const body: ProjectMemberAssignRequestDto = {
                userId: '507f1f77bcf86cd799439022',
                role: EnumProjectMemberRole.member,
            };
            workspaceMemberService.getOneByWorkspaceAndUser.mockResolvedValue(
                null
            );
            const created = { ...projectMemberRow, userId: body.userId };
            projectMemberService.assignMember.mockResolvedValue(created);

            await useCase.execute(project, actorMember, body);

            expect(projectMemberService.assignMember).toHaveBeenCalledWith(
                project,
                actor,
                null,
                body.role
            );
        });

        it('prepares both assigned activity logs before it reads the target workspace member', async () => {
            const body: ProjectMemberAssignRequestDto = {
                userId: '507f1f77bcf86cd799439022',
                role: EnumProjectMemberRole.member,
            };
            workspaceMemberService.getOneByWorkspaceAndUser.mockImplementation(
                async () => {
                    expect(activityLogService.prepare).toHaveBeenCalledTimes(2);
                    expect(
                        activityLogService.stagePrepared
                    ).not.toHaveBeenCalled();

                    return null;
                }
            );
            projectMemberService.assignMember.mockResolvedValue(
                projectMemberRow
            );

            await useCase.execute(project, actorMember, body);

            expect(
                workspaceMemberService.getOneByWorkspaceAndUser
            ).toHaveBeenCalledTimes(1);
        });

        it('prepares both assigned activity logs before the write and stages them after when the actor differs from the target', async () => {
            const body: ProjectMemberAssignRequestDto = {
                userId: '507f1f77bcf86cd799439022',
                role: EnumProjectMemberRole.member,
            };
            const actorId = '507f1f77bcf86cd799439033';
            workspaceMemberService.getOneByWorkspaceAndUser.mockResolvedValue(
                null
            );
            projectMemberService.assignMember.mockImplementation(async () => {
                expect(activityLogService.stagePrepared).not.toHaveBeenCalled();

                return projectMemberRow;
            });

            await useCase.execute(project, actorMember, body);

            expect(activityLogService.stagePrepared).toHaveBeenCalledWith([
                {
                    action: EnumActivityLogAction.projectMemberAssigned,
                    userId: actorId,
                    createdBy: actorId,
                    workspaceId: project.workspaceId,
                    metadata: { targetUserId: body.userId },
                },
                {
                    action: EnumActivityLogAction.projectMemberAssignedByAdmin,
                    userId: body.userId,
                    createdBy: actorId,
                    workspaceId: project.workspaceId,
                    metadata: { actorUserId: actorId },
                },
            ]);
        });

        it('prepares one assigned activity log when the actor assigns themselves', async () => {
            const actorId = '507f1f77bcf86cd799439033';
            const body: ProjectMemberAssignRequestDto = {
                userId: actorId,
                role: EnumProjectMemberRole.member,
            };
            workspaceMemberService.getOneByWorkspaceAndUser.mockResolvedValue(
                null
            );
            projectMemberService.assignMember.mockResolvedValue(
                projectMemberRow
            );

            await useCase.execute(project, actorMember, body);

            expect(activityLogService.stagePrepared).toHaveBeenCalledWith([
                {
                    action: EnumActivityLogAction.projectMemberAssigned,
                    userId: actorId,
                    createdBy: actorId,
                    workspaceId: project.workspaceId,
                    metadata: { targetUserId: actorId },
                },
            ]);
        });

        it('stages nothing when the domain throws', async () => {
            const body: ProjectMemberAssignRequestDto = {
                userId: '507f1f77bcf86cd799439022',
                role: EnumProjectMemberRole.member,
            };
            workspaceMemberService.getOneByWorkspaceAndUser.mockResolvedValue(
                null
            );
            projectMemberService.assignMember.mockRejectedValue(
                new Error('boom')
            );

            await expect(
                useCase.execute(project, actorMember, body)
            ).rejects.toThrow('boom');
            expect(activityLogService.stagePrepared).not.toHaveBeenCalled();
        });
    });
});
