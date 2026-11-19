import { PaginationQueryUtil } from '@common/pagination/utils/pagination.query.util';
import { RequestStoreService } from '@common/request/services/request.store.service';
import { EnumPaginationType } from '@common/pagination/enums/pagination.enum';
import type { IPaginationQueryOffsetParams } from '@common/pagination/interfaces/pagination.interface';
import { AnalyticSnapshotOrderBy } from '@modules/analytic/constants/analytic.list.constant';
import { Test } from '@nestjs/testing';
import type { TestingModule } from '@nestjs/testing';
import { mock } from 'vitest-mock-extended';
import type { MockProxy } from 'vitest-mock-extended';
import { AnalyticWorkspaceService } from '@modules/analytic/services/analytic.workspace.service';
import { AnalyticWorkspacesMembershipListUseCase } from '@modules/analytic/use-cases/analytic.workspaces-membership-list.use-case';
import { EnumAnalyticSnapshotOrderBy } from '@modules/analytic/enums/analytic.enum';

describe('AnalyticWorkspacesMembershipListUseCase', () => {
    const analyticWorkspaceService: MockProxy<AnalyticWorkspaceService> =
        mock<AnalyticWorkspaceService>();

    const paginationQueryUtil: MockProxy<PaginationQueryUtil> =
        mock<PaginationQueryUtil>();

    const requestStoreService: MockProxy<RequestStoreService> =
        mock<RequestStoreService>();

    const pagination: IPaginationQueryOffsetParams = {
        skip: 0,
        limit: 20,
        orderBy: [],
    };

    let useCase: AnalyticWorkspacesMembershipListUseCase;

    beforeEach(async () => {
        vi.resetAllMocks();
        paginationQueryUtil.offset.mockReturnValue({
            params: pagination,
            storePatch: {},
        });

        const module: TestingModule = await Test.createTestingModule({
            providers: [
                AnalyticWorkspacesMembershipListUseCase,
                {
                    provide: AnalyticWorkspaceService,
                    useValue: analyticWorkspaceService,
                },
                { provide: PaginationQueryUtil, useValue: paginationQueryUtil },
                { provide: RequestStoreService, useValue: requestStoreService },
            ],
        }).compile();

        useCase = module.get(AnalyticWorkspacesMembershipListUseCase);
    });

    describe('execute', () => {
        it('returns the domain page unchanged', async () => {
            const page = {
                type: EnumPaginationType.offset as const,
                count: 1,
                perPage: 20,
                page: 1,
                totalPage: 1,
                hasNext: false,
                hasPrevious: false,
                data: [{ workspaceId: 'workspace-1', count: 3 }],
            };
            analyticWorkspaceService.workspacesMembership.mockResolvedValue(
                page
            );

            const result = await useCase.execute({
                page: 1,
                perPage: 20,
            });

            expect(result).toEqual(page);

            expect(paginationQueryUtil.offset).toHaveBeenCalledWith(
                expect.anything(),

                {
                    orderBy: AnalyticSnapshotOrderBy,
                    defaultOrderBy: EnumAnalyticSnapshotOrderBy.highestValue,
                }
            );
            expect(
                analyticWorkspaceService.workspacesMembership
            ).toHaveBeenCalledWith(pagination);
        });
    });
});
