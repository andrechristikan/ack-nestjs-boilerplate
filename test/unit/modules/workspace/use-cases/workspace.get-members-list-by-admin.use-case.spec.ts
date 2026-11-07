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
import { WorkspaceMemberDefaultAvailableOrderBy } from '@modules/workspace/constants/workspace.list.constant';
import type { WorkspaceAdminMemberListRequestDto } from '@modules/workspace/dtos/request/workspace.admin-member-list.request.dto';
import { WorkspaceMemberService } from '@modules/workspace/services/workspace.member.service';
import type { IWorkspaceMember } from '@modules/workspace/interfaces/workspace.interface';
import { WorkspaceGetMembersListByAdminUseCase } from '@modules/workspace/use-cases/workspace.get-members-list-by-admin.use-case';

describe('WorkspaceGetMembersListByAdminUseCase', () => {
    const workspaceMemberService: MockProxy<WorkspaceMemberService> =
        mock<WorkspaceMemberService>();
    const paginationQueryUtil: MockProxy<PaginationQueryUtil> =
        mock<PaginationQueryUtil>();
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
    let useCase: WorkspaceGetMembersListByAdminUseCase;

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
                WorkspaceGetMembersListByAdminUseCase,
                {
                    provide: WorkspaceMemberService,
                    useValue: workspaceMemberService,
                },
                {
                    provide: PaginationQueryUtil,
                    useValue: paginationQueryUtil,
                },
                { provide: RequestStoreService, useValue: requestStoreService },
            ],
        }).compile();

        useCase = module.get(WorkspaceGetMembersListByAdminUseCase);
    });

    describe('execute', () => {
        it('parses the offset query, merges the store patch, and returns the page', async () => {
            const query: WorkspaceAdminMemberListRequestDto = {};
            const page: IResponsePaginationReturn<IWorkspaceMember> = {
                type: EnumPaginationType.offset,
                count: 0,
                perPage: 20,
                page: 1,
                totalPage: 0,
                hasNext: false,
                hasPrevious: false,
                data: [],
            };
            workspaceMemberService.getMembersListByAdmin.mockResolvedValue(
                page
            );

            await useCase.execute('workspace-1', query);

            expect(paginationQueryUtil.offset).toHaveBeenCalledWith(query, {
                availableOrderBy: WorkspaceMemberDefaultAvailableOrderBy,
            });
            expect(requestStoreService.merge).toHaveBeenCalledWith(
                PaginationStoreKey,
                {}
            );
            expect(
                workspaceMemberService.getMembersListByAdmin
            ).toHaveBeenCalledWith('workspace-1', offsetPagination);
        });
    });
});
