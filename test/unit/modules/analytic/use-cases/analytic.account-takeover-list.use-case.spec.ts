import { PaginationQueryUtil } from '@common/pagination/utils/pagination.query.util';
import { RequestStoreService } from '@common/request/services/request.store.service';
import { EnumPaginationType } from '@common/pagination/enums/pagination.enum';
import type { IPaginationQueryOffsetParams } from '@common/pagination/interfaces/pagination.interface';
import { Test } from '@nestjs/testing';
import type { TestingModule } from '@nestjs/testing';
import { mock } from 'vitest-mock-extended';
import type { MockProxy } from 'vitest-mock-extended';
import { AnalyticFraudService } from '@modules/analytic/services/analytic.fraud.service';
import { AnalyticDateService } from '@modules/analytic/services/analytic.date.service';
import { AnalyticAccountTakeoverAvailableOrderBy } from '@modules/analytic/constants/analytic.list.constant';
import { AnalyticAccountTakeoverListUseCase } from '@modules/analytic/use-cases/analytic.account-takeover-list.use-case';

describe('AnalyticAccountTakeoverListUseCase', () => {
    const analyticFraudService: MockProxy<AnalyticFraudService> =
        mock<AnalyticFraudService>();

    const analyticDateService: MockProxy<AnalyticDateService> =
        mock<AnalyticDateService>();

    const paginationQueryUtil: MockProxy<PaginationQueryUtil> =
        mock<PaginationQueryUtil>();

    const requestStoreService: MockProxy<RequestStoreService> =
        mock<RequestStoreService>();

    const startDate: Date = new Date('2026-01-01T00:00:00.000Z');

    const endDate: Date = new Date('2026-02-01T00:00:00.000Z');

    const pagination: IPaginationQueryOffsetParams<unknown> = {
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

    let useCase: AnalyticAccountTakeoverListUseCase;

    beforeEach(async () => {
        vi.resetAllMocks();
        paginationQueryUtil.offset.mockReturnValue({
            params: pagination,
            storePatch: {},
        });

        const module: TestingModule = await Test.createTestingModule({
            providers: [
                AnalyticAccountTakeoverListUseCase,
                {
                    provide: AnalyticFraudService,
                    useValue: analyticFraudService,
                },
                { provide: AnalyticDateService, useValue: analyticDateService },
                { provide: PaginationQueryUtil, useValue: paginationQueryUtil },
                { provide: RequestStoreService, useValue: requestStoreService },
            ],
        }).compile();

        useCase = module.get(AnalyticAccountTakeoverListUseCase);
    });

    describe('execute', () => {
        it('hands the required range and pagination to the domain', async () => {
            analyticDateService.requireRange.mockReturnValue({
                startDate,
                endDate,
            });
            const page = {
                ...offsetPage,
                data: [
                    {
                        userId: 'user-1',
                        indicatorCodes: ['newDeviceAfterPasswordChange'],
                        passwordChangedAt: startDate,
                    },
                ],
            };
            analyticFraudService.accountTakeoverList.mockResolvedValue(page);

            const result = await useCase.execute({
                startDate,
                endDate,
                page: 1,
                perPage: 20,
            });

            expect(result).toEqual(page);
            expect(
                analyticFraudService.accountTakeoverList
            ).toHaveBeenCalledWith(startDate, endDate, pagination);
            expect(paginationQueryUtil.offset).toHaveBeenCalledWith(
                expect.anything(),
                { availableOrderBy: AnalyticAccountTakeoverAvailableOrderBy }
            );
        });
    });
});
