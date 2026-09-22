import { Test } from '@nestjs/testing';
import type { TestingModule } from '@nestjs/testing';
import { mock } from 'vitest-mock-extended';
import type { MockProxy } from 'vitest-mock-extended';

import { PaginationStoreKey } from '@common/pagination/constants/pagination.constant';
import { EnumPaginationType } from '@common/pagination/enums/pagination.enum';
import { PaginationQueryUtil } from '@common/pagination/utils/pagination.query.util';
import { RequestStoreService } from '@common/request/services/request.store.service';
import type { Workspace } from '@generated/prisma-client/client';
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
    const now = new Date('2026-01-01T00:00:00.000Z');
    const workspace = {
        id: 'workspace-id',
        name: 'Acme',
        slug: 'acme',
        description: null,
        isPublic: false,
        createdAt: now,
        createdBy: 'user-id',
        updatedAt: now,
        updatedBy: 'user-id',
        deletedAt: null,
        deletedBy: null,
    } satisfies Workspace;
    const cursorPage = {
        type: EnumPaginationType.cursor as const,
        count: 1,
        perPage: 20,
        hasNext: false,
        cursor: undefined,
        data: [workspace],
    };
    const offsetPage = {
        type: EnumPaginationType.offset as const,
        count: 1,
        perPage: 20,
        page: 1,
        totalPage: 1,
        hasNext: false,
        hasPrevious: false,
        data: [workspace],
    };
    const cursorParams = {
        where: undefined,
        limit: 20,
        cursor: undefined,
        cursorField: 'id',
        orderBy: [],
    };
    const cursorStorePatch = {
        perPage: 20,
        cursor: undefined,
        orderBy: [],
        availableSearch: ['slug', 'name'],
        availableOrderBy: ['createdAt'],
    };
    const offsetParams = {
        where: undefined,
        limit: 20,
        skip: 0,
        orderBy: [],
    };
    const offsetStorePatch = {
        page: 1,
        perPage: 20,
        orderBy: [],
        availableSearch: ['slug', 'name'],
        availableOrderBy: ['createdAt', 'name'],
    };

    let service: WorkspaceHttpService;

    beforeEach(async () => {
        vi.resetAllMocks();

        const module: TestingModule = await Test.createTestingModule({
            providers: [
                WorkspaceHttpService,
                { provide: WorkspaceDomain, useValue: workspaceDomain },
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

        service = module.get(WorkspaceHttpService);
    });

    describe('getListForMember', () => {
        it('merges the store patch and wraps the domain page', async () => {
            const query = {} satisfies WorkspaceUserListRequestDto;
            paginationQueryUtil.cursor.mockReturnValue({
                params: cursorParams,
                storePatch: cursorStorePatch,
            } as never);
            workspaceDomain.getListForMember.mockResolvedValue(cursorPage);

            const result = await service.getListForMember('user-id', query);

            expect(requestStoreService.merge).toHaveBeenCalledWith(
                PaginationStoreKey,
                cursorStorePatch
            );
            expect(workspaceDomain.getListForMember).toHaveBeenCalledWith(
                'user-id',
                cursorParams
            );
            expect(result).toEqual(cursorPage);
        });
    });

    describe('createWorkspace', () => {
        it('delegates to the domain and wraps the created workspace', async () => {
            const dto = {
                name: 'Acme',
                description: 'Our team workspace',
                isPublic: true,
            } satisfies WorkspaceCreateRequestDto;
            workspaceDomain.createWorkspace.mockResolvedValue(workspace);

            const result = await service.createWorkspace('user-id', dto);

            expect(result).toEqual({ data: workspace });
            expect(workspaceDomain.createWorkspace).toHaveBeenCalledWith(
                'user-id',
                {
                    name: dto.name,
                    description: dto.description,
                    isPublic: dto.isPublic,
                }
            );
        });
    });

    describe('getCurrentWorkspace', () => {
        it('wraps the domain result synchronously', () => {
            workspaceDomain.getCurrentWorkspace.mockReturnValue(workspace);

            const result = service.getCurrentWorkspace(workspace);

            expect(result).toEqual({ data: workspace });
            expect(workspaceDomain.getCurrentWorkspace).toHaveBeenCalledWith(
                workspace
            );
        });
    });

    describe('updateWorkspace', () => {
        it('delegates to the domain and wraps the updated workspace', async () => {
            const dto = {
                name: 'Acme Renamed',
                description: 'Updated description',
            } satisfies WorkspaceUpdateRequestDto;
            workspaceDomain.updateWorkspace.mockResolvedValue(workspace);

            const result = await service.updateWorkspace(
                'workspace-id',
                'actor-id',
                dto
            );

            expect(result).toEqual({ data: workspace });
            expect(workspaceDomain.updateWorkspace).toHaveBeenCalledWith(
                'workspace-id',
                'actor-id',
                { name: dto.name, description: dto.description }
            );
        });
    });

    describe('updateWorkspaceIsPublic', () => {
        it('delegates to the domain and wraps the updated workspace', async () => {
            const dto = {
                isPublic: true,
            } satisfies WorkspaceUpdateIsPublicRequestDto;
            workspaceDomain.updateWorkspaceIsPublic.mockResolvedValue(
                workspace
            );

            const result = await service.updateWorkspaceIsPublic(
                'workspace-id',
                'actor-id',
                dto
            );

            expect(result).toEqual({ data: workspace });
            expect(
                workspaceDomain.updateWorkspaceIsPublic
            ).toHaveBeenCalledWith('workspace-id', 'actor-id', true);
        });
    });

    describe('updateWorkspaceSlug', () => {
        it('delegates to the domain and wraps the updated workspace', async () => {
            const dto = {
                slug: 'acme-team',
            } satisfies WorkspaceUpdateSlugRequestDto;
            workspaceDomain.updateWorkspaceSlug.mockResolvedValue(workspace);

            const result = await service.updateWorkspaceSlug(
                'workspace-id',
                'actor-id',
                dto
            );

            expect(result).toEqual({ data: workspace });
            expect(workspaceDomain.updateWorkspaceSlug).toHaveBeenCalledWith(
                'workspace-id',
                'actor-id',
                'acme-team'
            );
        });
    });

    describe('switchWorkspace', () => {
        it('delegates to the domain', async () => {
            const dto = {
                workspaceId: 'workspace-id',
            } satisfies WorkspaceSwitchRequestDto;

            await service.switchWorkspace('user-id', dto);

            expect(workspaceDomain.switchWorkspace).toHaveBeenCalledWith(
                'user-id',
                'workspace-id'
            );
        });
    });

    describe('softDeleteWorkspace', () => {
        it('delegates to the domain', async () => {
            await service.softDeleteWorkspace('workspace-id', 'actor-id');

            expect(workspaceDomain.softDeleteWorkspace).toHaveBeenCalledWith(
                'workspace-id',
                'actor-id'
            );
        });
    });

    describe('getListForAdmin', () => {
        it('merges the isPublic filter into the store patch when provided', async () => {
            const query = {
                isPublic: true,
            } satisfies WorkspaceAdminListRequestDto;
            paginationQueryUtil.offset.mockReturnValue({
                params: offsetParams,
                storePatch: offsetStorePatch,
            } as never);
            paginationQueryUtil.equalBoolean.mockReturnValue({
                where: { isPublic: { equals: true } },
                storeFilter: { isPublic: true },
            } as never);
            workspaceDomain.getListForAdmin.mockResolvedValue(offsetPage);

            const result = await service.getListForAdmin(query);

            expect(requestStoreService.merge).toHaveBeenCalledWith(
                PaginationStoreKey,
                {
                    ...offsetStorePatch,
                    filters: { isPublic: true },
                }
            );
            expect(workspaceDomain.getListForAdmin).toHaveBeenCalledWith(
                offsetParams,
                { isPublic: { equals: true } }
            );
            expect(result).toEqual(offsetPage);
        });

        it('merges an empty filter set when isPublic is not provided', async () => {
            const query = {} satisfies WorkspaceAdminListRequestDto;
            paginationQueryUtil.offset.mockReturnValue({
                params: offsetParams,
                storePatch: offsetStorePatch,
            } as never);
            paginationQueryUtil.equalBoolean.mockReturnValue(undefined);
            workspaceDomain.getListForAdmin.mockResolvedValue(offsetPage);

            await service.getListForAdmin(query);

            expect(requestStoreService.merge).toHaveBeenCalledWith(
                PaginationStoreKey,
                {
                    ...offsetStorePatch,
                    filters: {},
                }
            );
            expect(workspaceDomain.getListForAdmin).toHaveBeenCalledWith(
                offsetParams,
                undefined
            );
        });
    });

    describe('getByIdForAdmin', () => {
        it('delegates to the domain and wraps the workspace', async () => {
            workspaceDomain.getByIdForAdmin.mockResolvedValue(workspace);

            const result = await service.getByIdForAdmin('workspace-id');

            expect(result).toEqual({ data: workspace });
            expect(workspaceDomain.getByIdForAdmin).toHaveBeenCalledWith(
                'workspace-id'
            );
        });
    });

    describe('previewWorkspace', () => {
        it('delegates to the domain and wraps the workspace', async () => {
            workspaceDomain.previewWorkspace.mockResolvedValue(workspace);

            const result = await service.previewWorkspace('acme');

            expect(result).toEqual({ data: workspace });
            expect(workspaceDomain.previewWorkspace).toHaveBeenCalledWith(
                'acme'
            );
        });
    });
});
