import { Test } from '@nestjs/testing';
import type { TestingModule } from '@nestjs/testing';
import { mock } from 'vitest-mock-extended';
import type { MockProxy } from 'vitest-mock-extended';
import { PaginationStoreKey } from '@common/pagination/constants/pagination.constant';
import { EnumPaginationType } from '@common/pagination/enums/pagination.enum';
import type {
    IPaginationQueryCursorParams,
    IPaginationQueryOffsetParams,
} from '@common/pagination/interfaces/pagination.interface';
import { PaginationQueryUtil } from '@common/pagination/utils/pagination.query.util';
import { RequestStoreService } from '@common/request/services/request.store.service';
import type { IResponsePaginationReturn } from '@common/response/interfaces/response.interface';
import { Prisma } from '@generated/prisma-client/client';
import type { Workspace } from '@generated/prisma-client/client';
import {
    WorkspaceCursorAvailableOrderBy,
    WorkspaceDefaultAvailableOrderBy,
    WorkspaceDefaultAvailableSearch,
} from '@modules/workspace/constants/workspace.list.constant';
import type { WorkspaceAdminListRequestDto } from '@modules/workspace/dtos/request/workspace.admin-list.request.dto';
import type { WorkspaceCreateRequestDto } from '@modules/workspace/dtos/request/workspace.create.request.dto';
import type { WorkspaceSwitchRequestDto } from '@modules/workspace/dtos/request/workspace.switch.request.dto';
import type { WorkspaceUpdateIsPublicRequestDto } from '@modules/workspace/dtos/request/workspace.update-is-public.request.dto';
import type { WorkspaceUpdateSlugRequestDto } from '@modules/workspace/dtos/request/workspace.update-slug.request.dto';
import type { WorkspaceUpdateRequestDto } from '@modules/workspace/dtos/request/workspace.update.request.dto';
import type { WorkspaceUserListRequestDto } from '@modules/workspace/dtos/request/workspace.user-list.request.dto';
import { WorkspaceDomain } from '@modules/workspace/domains/workspace.domain';
import { WorkspaceHttpService } from '@modules/workspace/services/workspace.http.service';

describe('WorkspaceHttpService', () => {
    const workspaceDomain: MockProxy<WorkspaceDomain> = mock<WorkspaceDomain>();
    const paginationQueryUtil: MockProxy<PaginationQueryUtil> =
        mock<PaginationQueryUtil>();
    const requestStoreService: MockProxy<RequestStoreService> =
        mock<RequestStoreService>();

    const workspace: Workspace = {
        id: 'workspace-1',
        createdAt: new Date('2026-01-01T00:00:00.000Z'),
        createdBy: 'user-1',
        updatedAt: new Date('2026-01-01T00:00:00.000Z'),
        updatedBy: 'user-1',
        deletedAt: null,
        deletedBy: null,
        name: 'Acme',
        slug: 'acme-team',
        description: null,
        isPublic: false,
    };
    const offsetPagination: IPaginationQueryOffsetParams<Prisma.WorkspaceWhereInput> =
        { skip: 0, limit: 20, orderBy: [] };
    const cursorPagination: IPaginationQueryCursorParams<Prisma.WorkspaceWhereInput> =
        { limit: 20, orderBy: [] };

    let service: WorkspaceHttpService;

    beforeEach(async () => {
        vi.resetAllMocks();
        paginationQueryUtil.offset.mockReturnValue({
            params: offsetPagination,
            storePatch: {},
        });
        paginationQueryUtil.cursor.mockReturnValue({
            params: cursorPagination,
            storePatch: {},
        });

        const module: TestingModule = await Test.createTestingModule({
            providers: [
                WorkspaceHttpService,
                { provide: WorkspaceDomain, useValue: workspaceDomain },
                {
                    provide: PaginationQueryUtil,
                    useValue: paginationQueryUtil,
                },
                { provide: RequestStoreService, useValue: requestStoreService },
            ],
        }).compile();

        service = module.get(WorkspaceHttpService);
    });

    describe('getListCursorByMember', () => {
        it('parses the cursor query, merges the store patch, and returns the page', async () => {
            const query: WorkspaceUserListRequestDto = {};
            const page: IResponsePaginationReturn<Workspace> = {
                type: EnumPaginationType.cursor,
                perPage: 20,
                hasNext: false,
                data: [workspace],
            };
            workspaceDomain.getListCursorByMember.mockResolvedValue(page);

            const result = await service.getListCursorByMember('user-1', query);

            expect(result).toEqual(page);
            expect(paginationQueryUtil.cursor).toHaveBeenCalledWith(query, {
                availableSearch: WorkspaceDefaultAvailableSearch,
                availableOrderBy: WorkspaceCursorAvailableOrderBy,
            });
            expect(requestStoreService.merge).toHaveBeenCalledWith(
                PaginationStoreKey,
                {}
            );
            expect(workspaceDomain.getListCursorByMember).toHaveBeenCalledWith(
                'user-1',
                cursorPagination
            );
        });
    });

    describe('createWorkspace', () => {
        it('creates the workspace and wraps it in the response envelope', async () => {
            const body: WorkspaceCreateRequestDto = {
                name: 'Acme',
                description: 'Our team workspace',
                isPublic: true,
            };
            workspaceDomain.createWorkspace.mockResolvedValue(workspace);

            const result = await service.createWorkspace('user-1', body);

            expect(result).toEqual({ data: workspace });
            expect(workspaceDomain.createWorkspace).toHaveBeenCalledWith(
                'user-1',
                {
                    name: 'Acme',
                    description: 'Our team workspace',
                    isPublic: true,
                }
            );
        });
    });

    describe('createWorkspace without optional fields', () => {
        it('passes null for an omitted description and visibility', async () => {
            const body: WorkspaceCreateRequestDto = { name: 'Acme' };
            workspaceDomain.createWorkspace.mockResolvedValue(workspace);

            await service.createWorkspace('user-1', body);

            expect(workspaceDomain.createWorkspace).toHaveBeenCalledWith(
                'user-1',
                { name: 'Acme', description: null, isPublic: null }
            );
        });
    });

    describe('getCurrentWorkspace', () => {
        it('wraps the current workspace in the response envelope', () => {
            workspaceDomain.getCurrentWorkspace.mockReturnValue(workspace);

            const result = service.getCurrentWorkspace(workspace);

            expect(result).toEqual({ data: workspace });
            expect(workspaceDomain.getCurrentWorkspace).toHaveBeenCalledWith(
                workspace
            );
        });
    });

    describe('updateWorkspace', () => {
        it('updates the workspace and wraps it in the response envelope', async () => {
            const body: WorkspaceUpdateRequestDto = {
                name: 'Acme 2',
                description: 'Our team workspace',
            };
            workspaceDomain.updateWorkspace.mockResolvedValue(workspace);

            const result = await service.updateWorkspace(
                'workspace-1',
                'user-1',
                body
            );

            expect(result).toEqual({ data: workspace });
            expect(workspaceDomain.updateWorkspace).toHaveBeenCalledWith(
                'workspace-1',
                'user-1',
                { name: 'Acme 2', description: 'Our team workspace' }
            );
        });

        it('passes a null description through to clear it', async () => {
            const body: WorkspaceUpdateRequestDto = {
                name: 'Acme 2',
                description: null,
            };
            workspaceDomain.updateWorkspace.mockResolvedValue(workspace);

            await service.updateWorkspace('workspace-1', 'user-1', body);

            expect(workspaceDomain.updateWorkspace).toHaveBeenCalledWith(
                'workspace-1',
                'user-1',
                { name: 'Acme 2', description: null }
            );
        });
    });

    describe('updateWorkspaceIsPublic', () => {
        it('updates the visibility and wraps it in the response envelope', async () => {
            const body: WorkspaceUpdateIsPublicRequestDto = { isPublic: true };
            workspaceDomain.updateWorkspaceIsPublic.mockResolvedValue(
                workspace
            );

            const result = await service.updateWorkspaceIsPublic(
                'workspace-1',
                'user-1',
                body
            );

            expect(result).toEqual({ data: workspace });
            expect(
                workspaceDomain.updateWorkspaceIsPublic
            ).toHaveBeenCalledWith('workspace-1', 'user-1', true);
        });
    });

    describe('updateWorkspaceSlug', () => {
        it('updates the slug and wraps it in the response envelope', async () => {
            const body: WorkspaceUpdateSlugRequestDto = { slug: 'new-slug' };
            workspaceDomain.updateWorkspaceSlug.mockResolvedValue(workspace);

            const result = await service.updateWorkspaceSlug(
                'workspace-1',
                'user-1',
                body
            );

            expect(result).toEqual({ data: workspace });
            expect(workspaceDomain.updateWorkspaceSlug).toHaveBeenCalledWith(
                'workspace-1',
                'user-1',
                'new-slug'
            );
        });
    });

    describe('switchWorkspace', () => {
        it('switches the active workspace', async () => {
            const body: WorkspaceSwitchRequestDto = {
                workspaceId: 'workspace-1',
            };

            await service.switchWorkspace('user-1', body);

            expect(workspaceDomain.switchWorkspace).toHaveBeenCalledWith(
                'user-1',
                'workspace-1'
            );
        });
    });

    describe('softDeleteWorkspace', () => {
        it('soft-deletes the workspace', async () => {
            await service.softDeleteWorkspace('workspace-1', 'user-1');

            expect(workspaceDomain.softDeleteWorkspace).toHaveBeenCalledWith(
                'workspace-1',
                'user-1'
            );
        });
    });

    describe('getListOffsetByAdmin', () => {
        it('parses the offset query, merges the isPublic filter, and returns the page', async () => {
            const query: WorkspaceAdminListRequestDto = { isPublic: true };
            const isPublicFilter = {
                where: { isPublic: { equals: true } },
                storeFilter: { isPublic: true },
            };
            paginationQueryUtil.equalBoolean.mockReturnValue(isPublicFilter);
            const page: IResponsePaginationReturn<Workspace> = {
                type: EnumPaginationType.offset,
                count: 1,
                perPage: 20,
                page: 1,
                totalPage: 1,
                hasNext: false,
                hasPrevious: false,
                data: [workspace],
            };
            workspaceDomain.getListOffsetByAdmin.mockResolvedValue(page);

            const result = await service.getListOffsetByAdmin(query);

            expect(result).toEqual(page);
            expect(paginationQueryUtil.offset).toHaveBeenCalledWith(query, {
                availableSearch: WorkspaceDefaultAvailableSearch,
                availableOrderBy: WorkspaceDefaultAvailableOrderBy,
            });
            expect(paginationQueryUtil.equalBoolean).toHaveBeenCalledWith(
                Prisma.WorkspaceScalarFieldEnum.isPublic,
                true
            );
            expect(requestStoreService.merge).toHaveBeenCalledWith(
                PaginationStoreKey,
                { filters: { isPublic: true } }
            );
            expect(workspaceDomain.getListOffsetByAdmin).toHaveBeenCalledWith(
                offsetPagination,
                { isPublic: { equals: true } }
            );
        });

        it('merges an empty filter set when isPublic is absent', async () => {
            const query: WorkspaceAdminListRequestDto = {};
            paginationQueryUtil.equalBoolean.mockReturnValue(null);
            const page: IResponsePaginationReturn<Workspace> = {
                type: EnumPaginationType.offset,
                count: 0,
                perPage: 20,
                page: 1,
                totalPage: 0,
                hasNext: false,
                hasPrevious: false,
                data: [],
            };
            workspaceDomain.getListOffsetByAdmin.mockResolvedValue(page);

            await service.getListOffsetByAdmin(query);

            expect(requestStoreService.merge).toHaveBeenCalledWith(
                PaginationStoreKey,
                { filters: {} }
            );
            expect(workspaceDomain.getListOffsetByAdmin).toHaveBeenCalledWith(
                offsetPagination,
                undefined
            );
        });
    });

    describe('getByIdByAdmin', () => {
        it('wraps the workspace resolved for admin', async () => {
            workspaceDomain.getByIdByAdmin.mockResolvedValue(workspace);

            const result = await service.getByIdByAdmin('workspace-1');

            expect(result).toEqual({ data: workspace });
            expect(workspaceDomain.getByIdByAdmin).toHaveBeenCalledWith(
                'workspace-1'
            );
        });
    });

    describe('previewWorkspace', () => {
        it('wraps the public workspace preview', async () => {
            workspaceDomain.previewWorkspace.mockResolvedValue(workspace);

            const result = await service.previewWorkspace('acme-team');

            expect(result).toEqual({ data: workspace });
            expect(workspaceDomain.previewWorkspace).toHaveBeenCalledWith(
                'acme-team'
            );
        });
    });
});
