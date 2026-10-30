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
    EnumWorkspaceMemberRole,
    Prisma,
} from '@generated/prisma-client/client';
import type { Project, WorkspaceMember } from '@generated/prisma-client/client';
import type {
    IPaginationQueryCursorParams,
    IPaginationQueryOffsetParams,
} from '@common/pagination/interfaces/pagination.interface';
import {
    ProjectCursorAvailableOrderBy,
    ProjectDefaultAvailableOrderBy,
    ProjectDefaultAvailableSearch,
} from '@modules/project/constants/project.list.constant';
import type { ProjectAdminListRequestDto } from '@modules/project/dtos/request/project.admin-list.request.dto';
import type { ProjectCreateRequestDto } from '@modules/project/dtos/request/project.create.request.dto';
import type { ProjectUpdateSlugRequestDto } from '@modules/project/dtos/request/project.update-slug.request.dto';
import type { ProjectUpdateRequestDto } from '@modules/project/dtos/request/project.update.request.dto';
import type { ProjectUserListRequestDto } from '@modules/project/dtos/request/project.user-list.request.dto';
import { ActivityLogDomain } from '@modules/activity-log/domains/activity-log.domain';
import type { IActivityLogStaged } from '@modules/activity-log/interfaces/activity-log.interface';
import { ProjectDomain } from '@modules/project/domains/project.domain';
import { ProjectHttpService } from '@modules/project/services/http/project.http.service';

describe('ProjectHttpService', () => {
    const projectDomain: MockProxy<ProjectDomain> = mock<ProjectDomain>();
    const paginationQueryUtil: MockProxy<PaginationQueryUtil> =
        mock<PaginationQueryUtil>();
    const requestStoreService: MockProxy<RequestStoreService> =
        mock<RequestStoreService>();
    const activityLogDomain: MockProxy<ActivityLogDomain> =
        mock<ActivityLogDomain>();

    const paginationCursor: IPaginationQueryCursorParams<Prisma.ProjectWhereInput> =
        {
            where: {},
            orderBy: [],
            limit: 20,
        };
    const paginationOffset: IPaginationQueryOffsetParams<Prisma.ProjectWhereInput> =
        {
            where: {},
            orderBy: [],
            limit: 20,
            skip: 0,
        };

    const stagedActivityLog: IActivityLogStaged = {
        action: EnumActivityLogAction.projectCreated,
        metadata: {},
        userId: '507f1f77bcf86cd799439015',
        createdBy: '507f1f77bcf86cd799439015',
        workspaceId: '507f1f77bcf86cd799439012',
    };

    let service: ProjectHttpService;

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

    const workspaceMember: WorkspaceMember = {
        id: '507f1f77bcf86cd799439013',
        workspaceId: '507f1f77bcf86cd799439012',
        userId: '507f1f77bcf86cd799439014',
        role: EnumWorkspaceMemberRole.member,
        joinedAt: new Date('2026-01-01T00:00:00.000Z'),
        createdAt: new Date('2026-01-01T00:00:00.000Z'),
        createdBy: null,
        updatedAt: new Date('2026-01-01T00:00:00.000Z'),
        updatedBy: null,
    };

    beforeEach(async () => {
        vi.resetAllMocks();
        activityLogDomain.prepare.mockReturnValue(stagedActivityLog);

        const module: TestingModule = await Test.createTestingModule({
            providers: [
                ProjectHttpService,
                { provide: ProjectDomain, useValue: projectDomain },
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

        service = module.get(ProjectHttpService);
    });

    describe('getListCursorByMember', () => {
        it('parses the cursor query, merges the store patch, and returns the domain page', async () => {
            const query: ProjectUserListRequestDto = { perPage: 20 };
            paginationQueryUtil.cursor.mockReturnValue({
                params: paginationCursor,
                storePatch: { cursor: 'next' },
            });
            const page: IResponsePaginationReturn<Project> = {
                type: EnumPaginationType.cursor,
                perPage: 20,
                hasNext: false,
                data: [project],
            };
            projectDomain.getListCursorByMember.mockResolvedValue(page);

            const result = await service.getListCursorByMember(
                '507f1f77bcf86cd799439012',
                workspaceMember,
                query
            );

            expect(result).toEqual(page);
            expect(paginationQueryUtil.cursor).toHaveBeenCalledWith(query, {
                availableSearch: ProjectDefaultAvailableSearch,
                availableOrderBy: ProjectCursorAvailableOrderBy,
            });
            expect(requestStoreService.merge).toHaveBeenCalledWith(
                PaginationStoreKey,
                { cursor: 'next' }
            );
            expect(projectDomain.getListCursorByMember).toHaveBeenCalledWith(
                '507f1f77bcf86cd799439012',
                workspaceMember,
                paginationCursor
            );
        });
    });

    describe('createProject', () => {
        it('creates the project and wraps it in the response envelope', async () => {
            const body: ProjectCreateRequestDto = {
                name: 'Website Revamp',
                description: 'Marketing site redesign',
            };
            projectDomain.createProject.mockResolvedValue(project);

            const result = await service.createProject(
                '507f1f77bcf86cd799439012',
                '507f1f77bcf86cd799439015',
                body
            );

            expect(result).toEqual({ data: project });
            expect(projectDomain.createProject).toHaveBeenCalledWith(
                '507f1f77bcf86cd799439012',
                {
                    name: 'Website Revamp',
                    description: 'Marketing site redesign',
                }
            );
        });

        it('prepares the created activity log before the write and stages it after', async () => {
            const body: ProjectCreateRequestDto = { name: 'Website Revamp' };
            projectDomain.createProject.mockImplementation(async () => {
                expect(activityLogDomain.prepare).toHaveBeenCalledWith({
                    action: EnumActivityLogAction.projectCreated,
                    userId: '507f1f77bcf86cd799439015',
                    createdBy: '507f1f77bcf86cd799439015',
                    workspaceId: '507f1f77bcf86cd799439012',
                });
                expect(activityLogDomain.stagePrepared).not.toHaveBeenCalled();

                return project;
            });

            await service.createProject(
                '507f1f77bcf86cd799439012',
                '507f1f77bcf86cd799439015',
                body
            );

            expect(activityLogDomain.stagePrepared).toHaveBeenCalledWith([
                stagedActivityLog,
            ]);
        });

        it('stages nothing when the domain throws', async () => {
            const body: ProjectCreateRequestDto = { name: 'Website Revamp' };
            projectDomain.createProject.mockRejectedValue(new Error('boom'));

            await expect(
                service.createProject(
                    '507f1f77bcf86cd799439012',
                    '507f1f77bcf86cd799439015',
                    body
                )
            ).rejects.toThrow('boom');
            expect(activityLogDomain.stagePrepared).not.toHaveBeenCalled();
        });
    });

    describe('createProject without optional fields', () => {
        it('passes null for an omitted description', async () => {
            const body: ProjectCreateRequestDto = { name: 'Website Revamp' };
            projectDomain.createProject.mockResolvedValue(project);

            await service.createProject(
                '507f1f77bcf86cd799439012',
                '507f1f77bcf86cd799439015',
                body
            );

            expect(projectDomain.createProject).toHaveBeenCalledWith(
                '507f1f77bcf86cd799439012',
                { name: 'Website Revamp', description: null }
            );
        });
    });

    describe('getProject', () => {
        it('wraps the current project in the response envelope', () => {
            const result = service.getProject(project);

            expect(result).toEqual({ data: project });
        });
    });

    describe('updateProject', () => {
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
            projectDomain.updateProject.mockResolvedValue(updated);

            const result = await service.updateProject(
                project,
                '507f1f77bcf86cd799439015',
                body
            );

            expect(result).toEqual({ data: updated });
            expect(projectDomain.updateProject).toHaveBeenCalledWith(project, {
                name: 'New Name',
                description: 'New description',
            });
        });

        it('prepares the updated activity log before the write and stages it after', async () => {
            const body: ProjectUpdateRequestDto = {
                name: 'New Name',
                description: null,
            };
            projectDomain.updateProject.mockImplementation(async () => {
                expect(activityLogDomain.prepare).toHaveBeenCalledWith({
                    action: EnumActivityLogAction.projectUpdated,
                    userId: '507f1f77bcf86cd799439015',
                    createdBy: '507f1f77bcf86cd799439015',
                    workspaceId: project.workspaceId,
                });
                expect(activityLogDomain.stagePrepared).not.toHaveBeenCalled();

                return project;
            });

            await service.updateProject(
                project,
                '507f1f77bcf86cd799439015',
                body
            );

            expect(activityLogDomain.stagePrepared).toHaveBeenCalledWith([
                stagedActivityLog,
            ]);
        });

        it('passes a null description through to clear it', async () => {
            const body: ProjectUpdateRequestDto = {
                name: 'New Name',
                description: null,
            };
            const updated = { ...project, name: 'New Name', description: null };
            projectDomain.updateProject.mockResolvedValue(updated);

            await service.updateProject(
                project,
                '507f1f77bcf86cd799439015',
                body
            );

            expect(projectDomain.updateProject).toHaveBeenCalledWith(project, {
                name: 'New Name',
                description: null,
            });
        });
    });

    describe('updateProjectSlug', () => {
        it('updates the slug and wraps it in the response envelope', async () => {
            const body: ProjectUpdateSlugRequestDto = { slug: 'p-new-slug' };
            const updated = { ...project, slug: 'p-new-slug' };
            projectDomain.updateProjectSlug.mockResolvedValue(updated);

            const result = await service.updateProjectSlug(
                project,
                '507f1f77bcf86cd799439015',
                body
            );

            expect(result).toEqual({ data: updated });
            expect(projectDomain.updateProjectSlug).toHaveBeenCalledWith(
                project,
                'p-new-slug'
            );
        });

        it('prepares the updated activity log before the write and stages it after', async () => {
            const body: ProjectUpdateSlugRequestDto = { slug: 'p-new-slug' };
            projectDomain.updateProjectSlug.mockImplementation(async () => {
                expect(activityLogDomain.prepare).toHaveBeenCalledWith({
                    action: EnumActivityLogAction.projectUpdated,
                    userId: '507f1f77bcf86cd799439015',
                    createdBy: '507f1f77bcf86cd799439015',
                    workspaceId: project.workspaceId,
                });
                expect(activityLogDomain.stagePrepared).not.toHaveBeenCalled();

                return project;
            });

            await service.updateProjectSlug(
                project,
                '507f1f77bcf86cd799439015',
                body
            );

            expect(activityLogDomain.stagePrepared).toHaveBeenCalledWith([
                stagedActivityLog,
            ]);
        });
    });

    describe('softDeleteProject', () => {
        it('delegates the soft delete to the domain', async () => {
            await service.softDeleteProject(
                project,
                '507f1f77bcf86cd799439015'
            );

            expect(projectDomain.softDeleteProject).toHaveBeenCalledWith(
                project
            );
        });

        it('prepares the deleted activity log before the write and stages it after', async () => {
            projectDomain.softDeleteProject.mockImplementation(async () => {
                expect(activityLogDomain.prepare).toHaveBeenCalledWith({
                    action: EnumActivityLogAction.projectDeleted,
                    userId: '507f1f77bcf86cd799439015',
                    createdBy: '507f1f77bcf86cd799439015',
                    workspaceId: project.workspaceId,
                });
                expect(activityLogDomain.stagePrepared).not.toHaveBeenCalled();
            });

            await service.softDeleteProject(
                project,
                '507f1f77bcf86cd799439015'
            );

            expect(activityLogDomain.stagePrepared).toHaveBeenCalledWith([
                stagedActivityLog,
            ]);
        });
    });

    describe('getListOffsetByAdmin', () => {
        it('merges the workspaceId into the store filters when present', async () => {
            const query: ProjectAdminListRequestDto = {
                page: 1,
                perPage: 20,
                workspaceId: '507f1f77bcf86cd799439012',
            };
            paginationQueryUtil.offset.mockReturnValue({
                params: paginationOffset,
                storePatch: { page: 1, filters: { existing: true } },
            });
            const page: IResponsePaginationReturn<Project> = {
                type: EnumPaginationType.offset,
                count: 1,
                perPage: 20,
                hasNext: false,
                hasPrevious: false,
                page: 1,
                totalPage: 1,
                data: [project],
            };
            projectDomain.getListOffsetByAdmin.mockResolvedValue(page);

            const result = await service.getListOffsetByAdmin(query);

            expect(result).toEqual(page);
            expect(paginationQueryUtil.offset).toHaveBeenCalledWith(query, {
                availableSearch: ProjectDefaultAvailableSearch,
                availableOrderBy: ProjectDefaultAvailableOrderBy,
            });
            expect(requestStoreService.merge).toHaveBeenCalledWith(
                PaginationStoreKey,
                {
                    page: 1,
                    filters: {
                        existing: true,
                        workspaceId: '507f1f77bcf86cd799439012',
                    },
                }
            );
            expect(projectDomain.getListOffsetByAdmin).toHaveBeenCalledWith(
                paginationOffset,
                '507f1f77bcf86cd799439012'
            );
        });

        it('omits workspaceId from the store filters and the domain call when absent', async () => {
            const query: ProjectAdminListRequestDto = {
                page: 1,
                perPage: 20,
            };
            paginationQueryUtil.offset.mockReturnValue({
                params: paginationOffset,
                storePatch: { page: 1 },
            });
            const page: IResponsePaginationReturn<Project> = {
                type: EnumPaginationType.offset,
                count: 0,
                perPage: 20,
                hasNext: false,
                hasPrevious: false,
                page: 1,
                totalPage: 0,
                data: [],
            };
            projectDomain.getListOffsetByAdmin.mockResolvedValue(page);

            await service.getListOffsetByAdmin(query);

            expect(requestStoreService.merge).toHaveBeenCalledWith(
                PaginationStoreKey,
                { page: 1, filters: {} }
            );
            expect(projectDomain.getListOffsetByAdmin).toHaveBeenCalledWith(
                paginationOffset,
                null
            );
        });
    });

    describe('getByIdByAdmin', () => {
        it('wraps the resolved project in the response envelope', async () => {
            projectDomain.getByIdByAdmin.mockResolvedValue(project);

            const result = await service.getByIdByAdmin(
                '507f1f77bcf86cd799439011'
            );

            expect(result).toEqual({ data: project });
            expect(projectDomain.getByIdByAdmin).toHaveBeenCalledWith(
                '507f1f77bcf86cd799439011'
            );
        });
    });
});
