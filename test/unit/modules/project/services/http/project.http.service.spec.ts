import { Test } from '@nestjs/testing';
import type { TestingModule } from '@nestjs/testing';
import { mock } from 'vitest-mock-extended';
import type { MockProxy } from 'vitest-mock-extended';
import { AppUnknownException } from '@app/exceptions/app.unknown.exception';
import { DatabaseWriteConflictException } from '@common/database/exceptions/database.write-conflict.exception';
import type { IDatabaseTransactionClient } from '@common/database/interfaces/database.client.interface';
import { DatabaseService } from '@common/database/services/database.service';
import { DatabaseUtil } from '@common/database/utils/database.util';
import { HelperDateService } from '@common/helper/services/helper.date.service';
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
    ProjectUserListCursorScope,
} from '@modules/project/constants/project.list.constant';
import type { ProjectAdminListRequestDto } from '@modules/project/dtos/request/project.admin-list.request.dto';
import type { ProjectCreateRequestDto } from '@modules/project/dtos/request/project.create.request.dto';
import type { ProjectUpdateSlugRequestDto } from '@modules/project/dtos/request/project.update-slug.request.dto';
import type { ProjectUpdateRequestDto } from '@modules/project/dtos/request/project.update.request.dto';
import type { ProjectUserListRequestDto } from '@modules/project/dtos/request/project.user-list.request.dto';
import { ActivityLogDomain } from '@modules/activity-log/domains/activity-log.domain';
import type { IActivityLogStaged } from '@modules/activity-log/interfaces/activity-log.interface';
import { ProjectDomain } from '@modules/project/domains/project.domain';
import { ProjectNotFoundException } from '@modules/project/exceptions/project.not-found.exception';
import { ProjectHttpService } from '@modules/project/services/http/project.http.service';
import { WorkspaceInviteDomain } from '@modules/workspace/domains/workspace.invite.domain';

describe('ProjectHttpService', () => {
    const projectDomain: MockProxy<ProjectDomain> = mock<ProjectDomain>();
    const paginationQueryUtil: MockProxy<PaginationQueryUtil> =
        mock<PaginationQueryUtil>();
    const requestStoreService: MockProxy<RequestStoreService> =
        mock<RequestStoreService>();
    const activityLogDomain: MockProxy<ActivityLogDomain> =
        mock<ActivityLogDomain>();
    const workspaceInviteDomain: MockProxy<WorkspaceInviteDomain> =
        mock<WorkspaceInviteDomain>();
    const databaseService: MockProxy<DatabaseService> = mock<DatabaseService>();
    const databaseUtil: MockProxy<DatabaseUtil> = mock<DatabaseUtil>();
    const helperDateService: MockProxy<HelperDateService> =
        mock<HelperDateService>();
    const tx: IDatabaseTransactionClient = mock<IDatabaseTransactionClient>();
    const deletedAt = new Date('2026-02-01T00:00:00.000Z');

    const paginationCursor: IPaginationQueryCursorParams<Prisma.ProjectWhereInput> =
        {
            fingerprint: 'aaaaaaaaaaaaaaaa',
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
        helperDateService.create.mockReturnValue(deletedAt);
        databaseService.withTransaction.mockImplementation(async fn => fn(tx));

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
                {
                    provide: WorkspaceInviteDomain,
                    useValue: workspaceInviteDomain,
                },
                { provide: DatabaseService, useValue: databaseService },
                { provide: DatabaseUtil, useValue: databaseUtil },
                { provide: HelperDateService, useValue: helperDateService },
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
                scope: ProjectUserListCursorScope,
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
        it('soft-deletes the project and clears it from the pending invites in order on one transaction', async () => {
            const callOrder: string[] = [];
            projectDomain.softDeleteProjectInTx.mockImplementation(async () => {
                callOrder.push('project');
            });
            workspaceInviteDomain.clearProjectInTx.mockImplementation(
                async () => {
                    callOrder.push('invites');
                }
            );

            const result = await service.softDeleteProject(
                project,
                '507f1f77bcf86cd799439015'
            );

            expect(result).toEqual({});
            expect(databaseService.withTransaction).toHaveBeenCalledTimes(1);
            expect(projectDomain.softDeleteProjectInTx).toHaveBeenCalledWith(
                tx,
                project,
                deletedAt,
                '507f1f77bcf86cd799439015'
            );
            expect(workspaceInviteDomain.clearProjectInTx).toHaveBeenCalledWith(
                tx,
                project.id
            );
            expect(callOrder).toEqual(['project', 'invites']);
        });

        it('prepares the deleted activity log before the write and stages it after', async () => {
            projectDomain.softDeleteProjectInTx.mockImplementation(async () => {
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

        it('clears no invite and stages nothing when the soft delete rejects', async () => {
            const failure = new ProjectNotFoundException();
            projectDomain.softDeleteProjectInTx.mockRejectedValue(failure);

            await expect(
                service.softDeleteProject(project, '507f1f77bcf86cd799439015')
            ).rejects.toBe(failure);
            expect(
                workspaceInviteDomain.clearProjectInTx
            ).not.toHaveBeenCalled();
            expect(activityLogDomain.stagePrepared).not.toHaveBeenCalled();
        });

        it('answers ProjectNotFoundException on a write conflict', async () => {
            const conflict = new Error('conflict');
            projectDomain.softDeleteProjectInTx.mockRejectedValue(conflict);
            databaseUtil.toException.mockReturnValue(
                new DatabaseWriteConflictException()
            );

            await expect(
                service.softDeleteProject(project, '507f1f77bcf86cd799439015')
            ).rejects.toBeInstanceOf(ProjectNotFoundException);
            expect(databaseUtil.toException).toHaveBeenCalledWith(conflict);
            expect(activityLogDomain.stagePrepared).not.toHaveBeenCalled();
        });

        it('wraps an unknown error', async () => {
            projectDomain.softDeleteProjectInTx.mockRejectedValue(
                new Error('boom')
            );
            databaseUtil.toException.mockReturnValue(null);

            await expect(
                service.softDeleteProject(project, '507f1f77bcf86cd799439015')
            ).rejects.toBeInstanceOf(AppUnknownException);
            expect(activityLogDomain.stagePrepared).not.toHaveBeenCalled();
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
