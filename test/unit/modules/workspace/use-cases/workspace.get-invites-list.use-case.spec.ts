import { Test } from '@nestjs/testing';
import type { TestingModule } from '@nestjs/testing';
import { mock } from 'vitest-mock-extended';
import type { MockProxy } from 'vitest-mock-extended';
import { PaginationStoreKey } from '@common/pagination/constants/pagination.constant';
import { EnumPaginationType } from '@common/pagination/enums/pagination.enum';
import type { IPaginationQueryCursorParams } from '@common/pagination/interfaces/pagination.interface';
import { PaginationFilterUtil } from '@common/pagination/utils/pagination.filter.util';
import { PaginationQueryUtil } from '@common/pagination/utils/pagination.query.util';
import { RequestStoreService } from '@common/request/services/request.store.service';
import type { IResponsePaginationReturn } from '@common/response/interfaces/response.interface';
import {
    EnumWorkspaceInviteStatus,
    Prisma,
} from '@generated/prisma-client/client';

import {
    WorkspaceInviteDefaultAvailableOrderBy,
    WorkspaceInviteDefaultAvailableSearch,
    WorkspaceInviteDefaultStatus,
    WorkspaceInviteUserListCursorScope,
} from '@modules/workspace/constants/workspace.list.constant';
import type { WorkspaceInviteListRequestDto } from '@modules/workspace/dtos/request/workspace.invite-list.request.dto';
import { WorkspaceInviteService } from '@modules/workspace/services/workspace.invite.service';
import type { IWorkspaceInviteList } from '@modules/workspace/interfaces/workspace.interface';
import { WorkspaceGetInvitesListUseCase } from '@modules/workspace/use-cases/workspace.get-invites-list.use-case';

describe('WorkspaceGetInvitesListUseCase', () => {
    const workspaceInviteService: MockProxy<WorkspaceInviteService> =
        mock<WorkspaceInviteService>();
    const paginationQueryUtil: MockProxy<PaginationQueryUtil> =
        mock<PaginationQueryUtil>();
    const paginationFilterUtil: MockProxy<PaginationFilterUtil> =
        mock<PaginationFilterUtil>();
    const requestStoreService: MockProxy<RequestStoreService> =
        mock<RequestStoreService>();
    const cursorPagination: IPaginationQueryCursorParams<Prisma.WorkspaceInviteWhereInput> =
        {
            fingerprint: 'aaaaaaaaaaaaaaaa',
            limit: 20,
            orderBy: [],
        };
    let useCase: WorkspaceGetInvitesListUseCase;

    beforeEach(async () => {
        vi.resetAllMocks();
        paginationQueryUtil.cursor.mockReturnValue({
            params: cursorPagination,
            storePatch: {},
        });

        const module: TestingModule = await Test.createTestingModule({
            providers: [
                WorkspaceGetInvitesListUseCase,
                {
                    provide: WorkspaceInviteService,
                    useValue: workspaceInviteService,
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

        useCase = module.get(WorkspaceGetInvitesListUseCase);
    });

    describe('execute', () => {
        it('parses the cursor query, merges the status filter, and returns the page', async () => {
            const query: WorkspaceInviteListRequestDto = {
                status: 'pending',
            };
            const statusFilter = {
                where: { status: { in: [EnumWorkspaceInviteStatus.pending] } },
                storeFilter: { status: [EnumWorkspaceInviteStatus.pending] },
            };
            paginationFilterUtil.inEnum.mockReturnValue(statusFilter);
            const page: IResponsePaginationReturn<IWorkspaceInviteList> = {
                type: EnumPaginationType.cursor,
                perPage: 20,
                hasNext: false,
                data: [],
            };
            workspaceInviteService.getInvitesList.mockResolvedValue(page);

            await useCase.execute('workspace-1', query);

            expect(paginationQueryUtil.cursor).toHaveBeenCalledWith(query, {
                scope: WorkspaceInviteUserListCursorScope,
                availableSearch: WorkspaceInviteDefaultAvailableSearch,
                availableOrderBy: WorkspaceInviteDefaultAvailableOrderBy,
            });
            expect(paginationFilterUtil.inEnum).toHaveBeenCalledWith(
                Prisma.WorkspaceInviteScalarFieldEnum.status,
                'pending',
                WorkspaceInviteDefaultStatus
            );
            expect(requestStoreService.merge).toHaveBeenCalledWith(
                PaginationStoreKey,
                { filters: { status: [EnumWorkspaceInviteStatus.pending] } }
            );
            expect(workspaceInviteService.getInvitesList).toHaveBeenCalledWith(
                'workspace-1',
                cursorPagination,
                statusFilter.where
            );
        });

        it('merges an empty filter set when status is absent', async () => {
            paginationFilterUtil.inEnum.mockReturnValue(null);
            const page: IResponsePaginationReturn<IWorkspaceInviteList> = {
                type: EnumPaginationType.cursor,
                perPage: 20,
                hasNext: false,
                data: [],
            };
            workspaceInviteService.getInvitesList.mockResolvedValue(page);

            await useCase.execute('workspace-1', {});

            expect(requestStoreService.merge).toHaveBeenCalledWith(
                PaginationStoreKey,
                { filters: {} }
            );
        });
    });
});
