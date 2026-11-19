import { PaginationQueryUtil } from '@common/pagination/utils/pagination.query.util';
import { RequestStoreService } from '@common/request/services/request.store.service';
import { EnumPaginationType } from '@common/pagination/enums/pagination.enum';
import type { IPaginationQueryOffsetParams } from '@common/pagination/interfaces/pagination.interface';
import { Test } from '@nestjs/testing';
import type { TestingModule } from '@nestjs/testing';
import { mock } from 'vitest-mock-extended';
import type { MockProxy } from 'vitest-mock-extended';
import { AnalyticAnomalyService } from '@modules/analytic/services/analytic.anomaly.service';
import { AnalyticSnapshotOrderBy } from '@modules/analytic/constants/analytic.list.constant';
import { AnalyticLoginTimeListUseCase } from '@modules/analytic/use-cases/analytic.login-time-list.use-case';
import { EnumAnalyticSnapshotOrderBy } from '@modules/analytic/enums/analytic.enum';

describe('AnalyticLoginTimeListUseCase', () => {
    const analyticAnomalyService: MockProxy<AnalyticAnomalyService> =
        mock<AnalyticAnomalyService>();

    const paginationQueryUtil: MockProxy<PaginationQueryUtil> =
        mock<PaginationQueryUtil>();

    const requestStoreService: MockProxy<RequestStoreService> =
        mock<RequestStoreService>();

    const pagination: IPaginationQueryOffsetParams = {
        skip: 0,
        limit: 20,
        orderBy: [],
    };

    const offsetPage = {
        type: EnumPaginationType.offset as const,
        count: 1,
        perPage: 20,
        page: 1,
        totalPage: 1,
        hasNext: false,
        hasPrevious: false,
    };

    let useCase: AnalyticLoginTimeListUseCase;

    beforeEach(async () => {
        vi.resetAllMocks();
        paginationQueryUtil.offset.mockReturnValue({
            params: pagination,
            storePatch: {},
        });

        const module: TestingModule = await Test.createTestingModule({
            providers: [
                AnalyticLoginTimeListUseCase,
                {
                    provide: AnalyticAnomalyService,
                    useValue: analyticAnomalyService,
                },
                { provide: PaginationQueryUtil, useValue: paginationQueryUtil },
                { provide: RequestStoreService, useValue: requestStoreService },
            ],
        }).compile();

        useCase = module.get(AnalyticLoginTimeListUseCase);
    });

    describe('execute', () => {
        it('hands pagination to the domain', async () => {
            const page = {
                ...offsetPage,
                data: [
                    {
                        userId: 'user-1',
                        lastHour: 3,
                        historicalFrequencyPercent: 0,
                    },
                ],
            };
            analyticAnomalyService.loginTimeList.mockResolvedValue(page);

            const result = await useCase.execute({
                page: 1,
                perPage: 20,
            });

            expect(result).toEqual(page);
            expect(analyticAnomalyService.loginTimeList).toHaveBeenCalledWith(
                pagination
            );
            expect(paginationQueryUtil.offset).toHaveBeenCalledWith(
                expect.anything(),
                {
                    orderBy: AnalyticSnapshotOrderBy,
                    defaultOrderBy: EnumAnalyticSnapshotOrderBy.highestValue,
                }
            );
            expect(requestStoreService.merge).toHaveBeenCalledTimes(1);
        });
    });
});
