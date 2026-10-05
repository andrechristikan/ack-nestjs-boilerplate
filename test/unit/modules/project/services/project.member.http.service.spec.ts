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
import { ProjectMemberDefaultAvailableOrderBy } from '@modules/project/constants/project.list.constant';
import type { ProjectMemberAssignRequestDto } from '@modules/project/dtos/request/project.member-assign.request.dto';
import type { ProjectMemberListRequestDto } from '@modules/project/dtos/request/project.member-list.request.dto';
import type { ProjectMemberUpdateRoleRequestDto } from '@modules/project/dtos/request/project.member-update-role.request.dto';
import { ProjectMemberDomain } from '@modules/project/domains/project.member.domain';
import type { IProjectMember } from '@modules/project/interfaces/project.interface';
import { ProjectMemberHttpService } from '@modules/project/services/project.member.http.service';
import { WorkspaceMemberDomain } from '@modules/workspace/domains/workspace.member.domain';

describe('ProjectMemberHttpService', () => {
    const projectMemberDomain: MockProxy<ProjectMemberDomain> =
        mock<ProjectMemberDomain>();
    const workspaceMemberDomain: MockProxy<WorkspaceMemberDomain> =
        mock<WorkspaceMemberDomain>();
    const paginationQueryUtil: MockProxy<PaginationQueryUtil> =
        mock<PaginationQueryUtil>();
    const requestStoreService: MockProxy<RequestStoreService> =
        mock<RequestStoreService>();

    const pagination: IPaginationQueryCursorParams<Prisma.ProjectMemberWhereInput> =
        {
            where: {},
            orderBy: [],
            limit: 20,
        };

    let service: ProjectMemberHttpService;

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
                {
                    provide: PaginationQueryUtil,
                    useValue: paginationQueryUtil,
                },
                {
                    provide: RequestStoreService,
                    useValue: requestStoreService,
                },
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
                '507f1f77bcf86cd799439033',
                body
            );

            expect(result).toEqual({ data: created });
            expect(
                workspaceMemberDomain.getOneByWorkspaceAndUser
            ).toHaveBeenCalledWith(project.workspaceId, body.userId);
            expect(projectMemberDomain.assignMember).toHaveBeenCalledWith(
                project,
                '507f1f77bcf86cd799439033',
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

            await service.assignMember(
                project,
                '507f1f77bcf86cd799439033',
                body
            );

            expect(projectMemberDomain.assignMember).toHaveBeenCalledWith(
                project,
                '507f1f77bcf86cd799439033',
                null,
                body.role
            );
        });
    });

    describe('updateMemberRole', () => {
        it('delegates the role update to the domain', async () => {
            const body: ProjectMemberUpdateRoleRequestDto = {
                role: EnumProjectMemberRole.admin,
            };

            await service.updateMemberRole(
                project,
                '507f1f77bcf86cd799439033',
                '507f1f77bcf86cd799439021',
                body
            );

            expect(projectMemberDomain.updateMemberRole).toHaveBeenCalledWith(
                project,
                '507f1f77bcf86cd799439033',
                '507f1f77bcf86cd799439021',
                body.role
            );
        });
    });

    describe('removeMember', () => {
        it('delegates the removal to the domain', async () => {
            await service.removeMember(
                project,
                '507f1f77bcf86cd799439033',
                '507f1f77bcf86cd799439021'
            );

            expect(projectMemberDomain.removeMember).toHaveBeenCalledWith(
                project,
                '507f1f77bcf86cd799439033',
                '507f1f77bcf86cd799439021'
            );
        });
    });

    describe('leaveProject', () => {
        it('delegates leaving the project to the domain', async () => {
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

            await service.leaveProject(project, member);

            expect(projectMemberDomain.leaveProject).toHaveBeenCalledWith(
                project,
                member
            );
        });
    });
});
