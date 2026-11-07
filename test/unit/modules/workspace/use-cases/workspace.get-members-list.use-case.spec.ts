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
import {
    EnumWorkspaceMemberRole,
    Prisma,
} from '@generated/prisma-client/client';
import {
    WorkspaceMemberDefaultAvailableOrderBy,
    WorkspaceMemberDefaultRole,
    WorkspaceMemberUserListCursorScope,
} from '@modules/workspace/constants/workspace.list.constant';
import type { WorkspaceMemberListRequestDto } from '@modules/workspace/dtos/request/workspace.member-list.request.dto';
import { WorkspaceMemberService } from '@modules/workspace/services/workspace.member.service';
import type { IWorkspaceMember } from '@modules/workspace/interfaces/workspace.interface';
import { WorkspaceGetMembersListUseCase } from '@modules/workspace/use-cases/workspace.get-members-list.use-case';

describe('WorkspaceGetMembersListUseCase', () => {
    const workspaceMemberService: MockProxy<WorkspaceMemberService> =
        mock<WorkspaceMemberService>();
    const paginationQueryUtil: MockProxy<PaginationQueryUtil> =
        mock<PaginationQueryUtil>();
    const paginationFilterUtil: MockProxy<PaginationFilterUtil> =
        mock<PaginationFilterUtil>();
    const requestStoreService: MockProxy<RequestStoreService> =
        mock<RequestStoreService>();
    const cursorPagination: IPaginationQueryCursorParams<Prisma.WorkspaceMemberWhereInput> =
        {
            fingerprint: 'aaaaaaaaaaaaaaaa',
            limit: 20,
            orderBy: [],
        };
    const offsetPagination: IPaginationQueryOffsetParams<Prisma.WorkspaceMemberWhereInput> =
        { skip: 0, limit: 20, orderBy: [] };
    let useCase: WorkspaceGetMembersListUseCase;

    beforeEach(async () => {
        vi.resetAllMocks();
        paginationQueryUtil.cursor.mockReturnValue({
            params: cursorPagination,
            storePatch: {},
        });
        paginationQueryUtil.offset.mockReturnValue({
            params: offsetPagination,
            storePatch: {},
        });

        const module: TestingModule = await Test.createTestingModule({
            providers: [
                WorkspaceGetMembersListUseCase,
                {
                    provide: WorkspaceMemberService,
                    useValue: workspaceMemberService,
                },
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

        useCase = module.get(WorkspaceGetMembersListUseCase);
    });

    describe('execute', () => {
        it('parses the cursor query, merges the role filter, and returns the page', async () => {
            const query: WorkspaceMemberListRequestDto = { role: 'admin' };
            const roleFilter = {
                where: { role: { in: [EnumWorkspaceMemberRole.admin] } },
                storeFilter: { role: [EnumWorkspaceMemberRole.admin] },
            };
            paginationFilterUtil.inEnum.mockReturnValue(roleFilter);
            const page: IResponsePaginationReturn<IWorkspaceMember> = {
                type: EnumPaginationType.cursor,
                perPage: 20,
                hasNext: false,
                data: [],
            };
            workspaceMemberService.getMembersList.mockResolvedValue(page);

            await useCase.execute('workspace-1', query);

            expect(paginationQueryUtil.cursor).toHaveBeenCalledWith(query, {
                scope: WorkspaceMemberUserListCursorScope,
                availableOrderBy: WorkspaceMemberDefaultAvailableOrderBy,
            });
            expect(paginationFilterUtil.inEnum).toHaveBeenCalledWith(
                Prisma.WorkspaceMemberScalarFieldEnum.role,
                'admin',
                WorkspaceMemberDefaultRole
            );
            expect(requestStoreService.merge).toHaveBeenCalledWith(
                PaginationStoreKey,
                { filters: { role: [EnumWorkspaceMemberRole.admin] } }
            );
            expect(workspaceMemberService.getMembersList).toHaveBeenCalledWith(
                'workspace-1',
                cursorPagination,
                roleFilter.where
            );
        });

        it('merges an empty filter set when role is absent', async () => {
            paginationFilterUtil.inEnum.mockReturnValue(null);
            const page: IResponsePaginationReturn<IWorkspaceMember> = {
                type: EnumPaginationType.cursor,
                perPage: 20,
                hasNext: false,
                data: [],
            };
            workspaceMemberService.getMembersList.mockResolvedValue(page);

            await useCase.execute('workspace-1', {});

            expect(requestStoreService.merge).toHaveBeenCalledWith(
                PaginationStoreKey,
                { filters: {} }
            );
        });
    });
});
