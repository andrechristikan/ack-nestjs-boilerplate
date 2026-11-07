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
    WorkspaceDefaultAvailableSearch,
    WorkspaceUserListCursorScope,
} from '@modules/workspace/constants/workspace.list.constant';
import type { WorkspaceUserListRequestDto } from '@modules/workspace/dtos/request/workspace.user-list.request.dto';
import { WorkspaceService } from '@modules/workspace/services/workspace.service';
import { WorkspaceGetListCursorByMemberUseCase } from '@modules/workspace/use-cases/workspace.get-list-cursor-by-member.use-case';

describe('WorkspaceGetListCursorByMemberUseCase', () => {
    const workspaceService: MockProxy<WorkspaceService> =
        mock<WorkspaceService>();
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
        {
            fingerprint: 'aaaaaaaaaaaaaaaa',
            limit: 20,
            orderBy: [],
        };
    let useCase: WorkspaceGetListCursorByMemberUseCase;

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
                WorkspaceGetListCursorByMemberUseCase,
                { provide: WorkspaceService, useValue: workspaceService },
                {
                    provide: PaginationQueryUtil,
                    useValue: paginationQueryUtil,
                },
                { provide: RequestStoreService, useValue: requestStoreService },
            ],
        }).compile();

        useCase = module.get(WorkspaceGetListCursorByMemberUseCase);
    });

    describe('execute', () => {
        it('parses the cursor query, merges the store patch, and returns the page', async () => {
            const query: WorkspaceUserListRequestDto = {};
            const page: IResponsePaginationReturn<Workspace> = {
                type: EnumPaginationType.cursor,
                perPage: 20,
                hasNext: false,
                data: [workspace],
            };
            workspaceService.getListCursorByMember.mockResolvedValue(page);

            const result = await useCase.execute('user-1', query);

            expect(result).toEqual(page);
            expect(paginationQueryUtil.cursor).toHaveBeenCalledWith(query, {
                scope: WorkspaceUserListCursorScope,
                availableSearch: WorkspaceDefaultAvailableSearch,
                availableOrderBy: WorkspaceCursorAvailableOrderBy,
            });
            expect(requestStoreService.merge).toHaveBeenCalledWith(
                PaginationStoreKey,
                {}
            );
            expect(workspaceService.getListCursorByMember).toHaveBeenCalledWith(
                'user-1',
                cursorPagination
            );
        });
    });
});
