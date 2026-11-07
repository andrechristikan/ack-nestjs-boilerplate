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
    EnumWorkspaceJoinRequestStatus,
    Prisma,
} from '@generated/prisma-client/client';
import type { WorkspaceJoinRequest } from '@generated/prisma-client/client';
import { FeatureFlagService } from '@modules/feature-flag/services/feature-flag.service';
import { FeatureFlagDisabledException } from '@modules/feature-flag/exceptions/feature-flag.disabled.exception';
import {
    WorkspaceJoinRequestDefaultAvailableOrderBy,
    WorkspaceJoinRequestDefaultStatus,
    WorkspaceJoinRequestUserListCursorScope,
} from '@modules/workspace/constants/workspace.list.constant';
import type { WorkspaceJoinRequestListRequestDto } from '@modules/workspace/dtos/request/workspace.join-request-list.request.dto';
import { WorkspaceJoinRequestService } from '@modules/workspace/services/workspace.join-request.service';
import { WorkspaceGetJoinRequestsListUseCase } from '@modules/workspace/use-cases/workspace.get-join-requests-list.use-case';

describe('WorkspaceGetJoinRequestsListUseCase', () => {
    const workspaceJoinRequestService: MockProxy<WorkspaceJoinRequestService> =
        mock<WorkspaceJoinRequestService>();
    const featureFlagService: MockProxy<FeatureFlagService> =
        mock<FeatureFlagService>();
    const paginationQueryUtil: MockProxy<PaginationQueryUtil> =
        mock<PaginationQueryUtil>();
    const paginationFilterUtil: MockProxy<PaginationFilterUtil> =
        mock<PaginationFilterUtil>();
    const requestStoreService: MockProxy<RequestStoreService> =
        mock<RequestStoreService>();
    const cursorPagination: IPaginationQueryCursorParams<Prisma.WorkspaceJoinRequestWhereInput> =
        {
            fingerprint: 'aaaaaaaaaaaaaaaa',
            limit: 20,
            orderBy: [],
        };
    let useCase: WorkspaceGetJoinRequestsListUseCase;

    beforeEach(async () => {
        vi.resetAllMocks();
        paginationQueryUtil.cursor.mockReturnValue({
            params: cursorPagination,
            storePatch: {},
        });

        const module: TestingModule = await Test.createTestingModule({
            providers: [
                WorkspaceGetJoinRequestsListUseCase,
                {
                    provide: WorkspaceJoinRequestService,
                    useValue: workspaceJoinRequestService,
                },
                { provide: FeatureFlagService, useValue: featureFlagService },
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

        useCase = module.get(WorkspaceGetJoinRequestsListUseCase);
    });

    describe('execute', () => {
        it('gates on the flag before listing', async () => {
            featureFlagService.validateFeatureFlagMetadata.mockRejectedValue(
                new FeatureFlagDisabledException()
            );

            await expect(
                useCase.execute('workspace-1', {})
            ).rejects.toBeInstanceOf(FeatureFlagDisabledException);
            expect(
                workspaceJoinRequestService.getJoinRequestsList
            ).not.toHaveBeenCalled();
        });

        it('parses the cursor query, merges the status filter, and returns the page', async () => {
            const query: WorkspaceJoinRequestListRequestDto = {
                status: 'pending',
            };
            const statusFilter = {
                where: {
                    status: { in: [EnumWorkspaceJoinRequestStatus.pending] },
                },
                storeFilter: {
                    status: [EnumWorkspaceJoinRequestStatus.pending],
                },
            };
            paginationFilterUtil.inEnum.mockReturnValue(statusFilter);
            const page: IResponsePaginationReturn<WorkspaceJoinRequest> = {
                type: EnumPaginationType.cursor,
                perPage: 20,
                hasNext: false,
                data: [],
            };
            workspaceJoinRequestService.getJoinRequestsList.mockResolvedValue(
                page
            );

            await useCase.execute('workspace-1', query);

            expect(paginationQueryUtil.cursor).toHaveBeenCalledWith(query, {
                scope: WorkspaceJoinRequestUserListCursorScope,
                availableOrderBy: WorkspaceJoinRequestDefaultAvailableOrderBy,
            });
            expect(paginationFilterUtil.inEnum).toHaveBeenCalledWith(
                Prisma.WorkspaceJoinRequestScalarFieldEnum.status,
                'pending',
                WorkspaceJoinRequestDefaultStatus
            );
            expect(requestStoreService.merge).toHaveBeenCalledWith(
                PaginationStoreKey,
                {
                    filters: {
                        status: [EnumWorkspaceJoinRequestStatus.pending],
                    },
                }
            );
            expect(
                workspaceJoinRequestService.getJoinRequestsList
            ).toHaveBeenCalledWith(
                'workspace-1',
                cursorPagination,
                statusFilter.where
            );
        });

        it('merges an empty filter set when status is absent', async () => {
            paginationFilterUtil.inEnum.mockReturnValue(null);
            const page: IResponsePaginationReturn<WorkspaceJoinRequest> = {
                type: EnumPaginationType.cursor,
                perPage: 20,
                hasNext: false,
                data: [],
            };
            workspaceJoinRequestService.getJoinRequestsList.mockResolvedValue(
                page
            );

            await useCase.execute('workspace-1', {});

            expect(requestStoreService.merge).toHaveBeenCalledWith(
                PaginationStoreKey,
                { filters: {} }
            );
        });
    });
});
