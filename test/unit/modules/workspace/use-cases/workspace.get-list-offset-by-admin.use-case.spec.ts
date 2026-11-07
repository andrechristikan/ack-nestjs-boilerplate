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
import { PaginationFilterUtil } from '@common/pagination/utils/pagination.filter.util';
import { PaginationQueryUtil } from '@common/pagination/utils/pagination.query.util';
import { RequestStoreService } from '@common/request/services/request.store.service';
import type { IResponsePaginationReturn } from '@common/response/interfaces/response.interface';
import { Prisma } from '@generated/prisma-client/client';
import type { Workspace } from '@generated/prisma-client/client';
import {
    WorkspaceDefaultAvailableOrderBy,
    WorkspaceDefaultAvailableSearch,
} from '@modules/workspace/constants/workspace.list.constant';
import type { WorkspaceAdminListRequestDto } from '@modules/workspace/dtos/request/workspace.admin-list.request.dto';
import { WorkspaceService } from '@modules/workspace/services/workspace.service';
import { WorkspaceGetListOffsetByAdminUseCase } from '@modules/workspace/use-cases/workspace.get-list-offset-by-admin.use-case';

describe('WorkspaceGetListOffsetByAdminUseCase', () => {
    const workspaceService: MockProxy<WorkspaceService> =
        mock<WorkspaceService>();
    const paginationQueryUtil: MockProxy<PaginationQueryUtil> =
        mock<PaginationQueryUtil>();
    const paginationFilterUtil: MockProxy<PaginationFilterUtil> =
        mock<PaginationFilterUtil>();
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
        {
            fingerprint: 'aaaaaaaaaaaaaaaa',
            limit: 20,
            orderBy: [],
        };
    let useCase: WorkspaceGetListOffsetByAdminUseCase;

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
                WorkspaceGetListOffsetByAdminUseCase,
                { provide: WorkspaceService, useValue: workspaceService },
                {
                    provide: PaginationQueryUtil,
                    useValue: paginationQueryUtil,
                },
                {
                    provide: PaginationFilterUtil,
                    useValue: paginationFilterUtil,
                },
                { provide: RequestStoreService, useValue: requestStoreService },
            ],
        }).compile();

        useCase = module.get(WorkspaceGetListOffsetByAdminUseCase);
    });

    describe('execute', () => {
        it('parses the offset query, merges the isPublic filter, and returns the page', async () => {
            const query: WorkspaceAdminListRequestDto = { isPublic: true };
            const isPublicFilter = {
                where: { isPublic: { equals: true } },
                storeFilter: { isPublic: true },
            };
            paginationFilterUtil.equalBoolean.mockReturnValue(isPublicFilter);
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
            workspaceService.getListOffsetByAdmin.mockResolvedValue(page);

            const result = await useCase.execute(query);

            expect(result).toEqual(page);
            expect(paginationQueryUtil.offset).toHaveBeenCalledWith(query, {
                availableSearch: WorkspaceDefaultAvailableSearch,
                availableOrderBy: WorkspaceDefaultAvailableOrderBy,
            });
            expect(paginationFilterUtil.equalBoolean).toHaveBeenCalledWith(
                Prisma.WorkspaceScalarFieldEnum.isPublic,
                true
            );
            expect(requestStoreService.merge).toHaveBeenCalledWith(
                PaginationStoreKey,
                { filters: { isPublic: true } }
            );
            expect(workspaceService.getListOffsetByAdmin).toHaveBeenCalledWith(
                offsetPagination,
                { isPublic: { equals: true } }
            );
        });

        it('merges an empty filter set when isPublic is absent', async () => {
            const query: WorkspaceAdminListRequestDto = {};
            paginationFilterUtil.equalBoolean.mockReturnValue(null);
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
            workspaceService.getListOffsetByAdmin.mockResolvedValue(page);

            await useCase.execute(query);

            expect(requestStoreService.merge).toHaveBeenCalledWith(
                PaginationStoreKey,
                { filters: {} }
            );
            expect(workspaceService.getListOffsetByAdmin).toHaveBeenCalledWith(
                offsetPagination,
                undefined
            );
        });
    });
});
