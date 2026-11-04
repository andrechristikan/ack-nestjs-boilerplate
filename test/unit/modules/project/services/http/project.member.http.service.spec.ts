import { Test } from '@nestjs/testing';
import type { TestingModule } from '@nestjs/testing';
import { mock } from 'vitest-mock-extended';
import type { MockProxy } from 'vitest-mock-extended';
import { EnumPaginationType } from '@common/pagination/enums/pagination.enum';
import { PaginationStoreKey } from '@common/pagination/constants/pagination.constant';
import { PaginationQueryUtil } from '@common/pagination/utils/pagination.query.util';
import { RequestStoreService } from '@common/request/services/request.store.service';
import type { IResponsePaginationReturn } from '@common/response/interfaces/response.interface';
import {
    EnumActivityLogAction,
    EnumProjectMemberRole,
    EnumWorkspaceMemberRole,
} from '@generated/prisma-client/client';
import { Prisma } from '@generated/prisma-client/client';
import type {
    Project,
    ProjectMember,
    WorkspaceMember,
} from '@generated/prisma-client/client';
import type { IPaginationQueryCursorParams } from '@common/pagination/interfaces/pagination.interface';
import type { ProjectMemberAssignRequestDto } from '@modules/project/dtos/request/project.member-assign.request.dto';
import type { ProjectMemberListRequestDto } from '@modules/project/dtos/request/project.member-list.request.dto';
import type { ProjectMemberUpdateRoleRequestDto } from '@modules/project/dtos/request/project.member-update-role.request.dto';
import { ActivityLogDomain } from '@modules/activity-log/domains/activity-log.domain';
import type {
    IActivityLogStaged,
    IActivityLogStageInput,
} from '@modules/activity-log/interfaces/activity-log.interface';
import { ProjectMemberDomain } from '@modules/project/domains/project.member.domain';
import type {
    IProjectMember,
    IProjectMemberActor,
} from '@modules/project/interfaces/project.interface';
import { ProjectUtil } from '@modules/project/utils/project.util';
import { ProjectMemberHttpService } from '@modules/project/services/http/project.member.http.service';
import { WorkspaceMemberDomain } from '@modules/workspace/domains/workspace.member.domain';
import { ProjectMemberDefaultAvailableOrderBy } from '@modules/project/constants/project.list.constant';

describe('ProjectMemberHttpService', () => {
    const projectMemberDomain: MockProxy<ProjectMemberDomain> =
        mock<ProjectMemberDomain>();
    const workspaceMemberDomain: MockProxy<WorkspaceMemberDomain> =
        mock<WorkspaceMemberDomain>();
    const paginationQueryUtil: MockProxy<PaginationQueryUtil> =
        mock<PaginationQueryUtil>();
    const requestStoreService: MockProxy<RequestStoreService> =
        mock<RequestStoreService>();
    const activityLogDomain: MockProxy<ActivityLogDomain> =
        mock<ActivityLogDomain>();
    const projectUtil: MockProxy<ProjectUtil> = mock<ProjectUtil>();

    const pagination: IPaginationQueryCursorParams<Prisma.ProjectMemberWhereInput> =
        {
            firstPageAt: new Date('2026-01-01T00:00:00.000Z'),
            where: {},
            orderBy: [],
            limit: 20,
        };

    let service: ProjectMemberHttpService;

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
        activityLogDomain.prepare.mockImplementation(
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
                ProjectMemberHttpService,
                {
                    provide: ProjectMemberDomain,
                    useValue: projectMemberDomain,
                },
                {
                    provide: WorkspaceMemberDomain,
                    useValue: workspaceMemberDomain,
                },
                { provide: ProjectUtil, useValue: projectUtil },
                {
                    provide: PaginationQueryUtil,
                    useValue: paginationQueryUtil,
                },
                {
                    provide: RequestStoreService,
                    useValue: requestStoreService,
                },
                { provide: ActivityLogDomain, useValue: activityLogDomain },
            ],
        }).compile();

        service = module.get(ProjectMemberHttpService);
    });

    describe('getMembersList', () => {
        it('parses the cursor query, merges the store patch, and returns the domain page', async () => {
            const query: ProjectMemberListRequestDto = { perPage: 20 };
            paginationQueryUtil.cursor.mockReturnValue({
                params: pagination,
                storePatch: { cursor: 'next' },
            });
            const page: IResponsePaginationReturn<IProjectMember> = {
                type: EnumPaginationType.cursor,
                perPage: 20,
                hasNext: false,
                data: [projectMemberRow],
            };
            projectMemberDomain.getMembersList.mockResolvedValue(page);

            const result = await service.getMembersList(project, query);

            expect(result).toEqual(page);
            expect(paginationQueryUtil.cursor).toHaveBeenCalledWith(query, {
                availableOrderBy: ProjectMemberDefaultAvailableOrderBy,
            });
            expect(requestStoreService.merge).toHaveBeenCalledWith(
                PaginationStoreKey,
                { cursor: 'next' }
            );
            expect(projectMemberDomain.getMembersList).toHaveBeenCalledWith(
                project,
                pagination
            );
        });
    });

    describe('assignMember', () => {
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
            workspaceMemberDomain.getOneByWorkspaceAndUser.mockResolvedValue(
                targetMember
            );
            const created = { ...projectMemberRow, userId: body.userId };
            projectMemberDomain.assignMember.mockResolvedValue(created);

            const result = await service.assignMember(
                project,
                actorMember,
                body
            );

            expect(result).toEqual({ data: created });
            expect(
                workspaceMemberDomain.getOneByWorkspaceAndUser
            ).toHaveBeenCalledWith(project.workspaceId, body.userId);
            expect(projectUtil.mapMemberActor).toHaveBeenCalledWith(
                actorMember
            );
            expect(projectMemberDomain.assignMember).toHaveBeenCalledWith(
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
            workspaceMemberDomain.getOneByWorkspaceAndUser.mockResolvedValue(
                null
            );
            const created = { ...projectMemberRow, userId: body.userId };
            projectMemberDomain.assignMember.mockResolvedValue(created);

            await service.assignMember(project, actorMember, body);

            expect(projectMemberDomain.assignMember).toHaveBeenCalledWith(
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
            workspaceMemberDomain.getOneByWorkspaceAndUser.mockImplementation(
                async () => {
                    expect(activityLogDomain.prepare).toHaveBeenCalledTimes(2);
                    expect(
                        activityLogDomain.stagePrepared
                    ).not.toHaveBeenCalled();

                    return null;
                }
            );
            projectMemberDomain.assignMember.mockResolvedValue(
                projectMemberRow
            );

            await service.assignMember(project, actorMember, body);

            expect(
                workspaceMemberDomain.getOneByWorkspaceAndUser
            ).toHaveBeenCalledTimes(1);
        });

        it('prepares both assigned activity logs before the write and stages them after when the actor differs from the target', async () => {
            const body: ProjectMemberAssignRequestDto = {
                userId: '507f1f77bcf86cd799439022',
                role: EnumProjectMemberRole.member,
            };
            const actorId = '507f1f77bcf86cd799439033';
            workspaceMemberDomain.getOneByWorkspaceAndUser.mockResolvedValue(
                null
            );
            projectMemberDomain.assignMember.mockImplementation(async () => {
                expect(activityLogDomain.stagePrepared).not.toHaveBeenCalled();

                return projectMemberRow;
            });

            await service.assignMember(project, actorMember, body);

            expect(activityLogDomain.stagePrepared).toHaveBeenCalledWith([
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
            workspaceMemberDomain.getOneByWorkspaceAndUser.mockResolvedValue(
                null
            );
            projectMemberDomain.assignMember.mockResolvedValue(
                projectMemberRow
            );

            await service.assignMember(project, actorMember, body);

            expect(activityLogDomain.stagePrepared).toHaveBeenCalledWith([
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
            workspaceMemberDomain.getOneByWorkspaceAndUser.mockResolvedValue(
                null
            );
            projectMemberDomain.assignMember.mockRejectedValue(
                new Error('boom')
            );

            await expect(
                service.assignMember(project, actorMember, body)
            ).rejects.toThrow('boom');
            expect(activityLogDomain.stagePrepared).not.toHaveBeenCalled();
        });
    });

    describe('updateMemberRole', () => {
        it('delegates the role update to the domain', async () => {
            const body: ProjectMemberUpdateRoleRequestDto = {
                role: EnumProjectMemberRole.admin,
            };
            projectMemberDomain.updateMemberRole.mockResolvedValue(
                projectMemberRow
            );

            await service.updateMemberRole(
                project,
                actorMember,
                '507f1f77bcf86cd799439021',
                body
            );

            expect(projectUtil.mapMemberActor).toHaveBeenCalledWith(
                actorMember
            );
            expect(projectMemberDomain.updateMemberRole).toHaveBeenCalledWith(
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
            projectMemberDomain.updateMemberRole.mockResolvedValue(
                projectMemberRow
            );

            await service.updateMemberRole(
                project,
                actorMember,
                projectMemberRow.id,
                body
            );

            expect(activityLogDomain.stagePrepared).toHaveBeenCalledWith([
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
            projectMemberDomain.updateMemberRole.mockResolvedValue(
                projectMemberRow
            );

            projectUtil.mapMemberActor.mockReturnValue({
                userId: projectMemberRow.userId,
                hasWorkspaceBypass: true,
            });

            await service.updateMemberRole(
                project,
                { ...actorMember, userId: projectMemberRow.userId },
                projectMemberRow.id,
                body
            );

            expect(activityLogDomain.stagePrepared).toHaveBeenCalledWith([
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

    describe('removeMember', () => {
        it('delegates the removal to the domain', async () => {
            projectMemberDomain.removeMember.mockResolvedValue(
                projectMemberRow
            );

            await service.removeMember(
                project,
                actorMember,
                '507f1f77bcf86cd799439021'
            );

            expect(projectUtil.mapMemberActor).toHaveBeenCalledWith(
                actorMember
            );
            expect(projectMemberDomain.removeMember).toHaveBeenCalledWith(
                project,
                actor,
                '507f1f77bcf86cd799439021'
            );
        });

        it('stages both removed activity logs from the removed member', async () => {
            const actorId = '507f1f77bcf86cd799439033';
            projectMemberDomain.removeMember.mockResolvedValue(
                projectMemberRow
            );

            await service.removeMember(
                project,
                actorMember,
                projectMemberRow.id
            );

            expect(activityLogDomain.stagePrepared).toHaveBeenCalledWith([
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

    describe('leaveProject', () => {
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
            await service.leaveProject(project, member);

            expect(projectMemberDomain.leaveProject).toHaveBeenCalledWith(
                member
            );
        });

        it('prepares the left activity log before the write and stages it after', async () => {
            projectMemberDomain.leaveProject.mockImplementation(async () => {
                expect(activityLogDomain.stagePrepared).not.toHaveBeenCalled();
            });

            await service.leaveProject(project, member);

            expect(activityLogDomain.stagePrepared).toHaveBeenCalledWith([
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
