import { PaginationQueryUtil } from '@common/pagination/utils/pagination.query.util';
import { RequestStoreService } from '@common/request/services/request.store.service';
import { EnumPaginationType } from '@common/pagination/enums/pagination.enum';
import type { IPaginationQueryOffsetParams } from '@common/pagination/interfaces/pagination.interface';
import { Test } from '@nestjs/testing';
import type { TestingModule } from '@nestjs/testing';
import { mock } from 'vitest-mock-extended';
import type { MockProxy } from 'vitest-mock-extended';
import { AnalyticAnomalyService } from '@modules/analytic/services/analytic.anomaly.service';
import { AnalyticDateService } from '@modules/analytic/services/analytic.date.service';
import { AnalyticImpossibleTravelAvailableOrderBy } from '@modules/analytic/constants/analytic.list.constant';
import { AnalyticImpossibleTravelListUseCase } from '@modules/analytic/use-cases/analytic.impossible-travel-list.use-case';

describe('AnalyticImpossibleTravelListUseCase', () => {
    const analyticAnomalyService: MockProxy<AnalyticAnomalyService> =
        mock<AnalyticAnomalyService>();

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

    let useCase: AnalyticImpossibleTravelListUseCase;

    beforeEach(async () => {
        vi.resetAllMocks();
        paginationQueryUtil.offset.mockReturnValue({
            params: pagination,
            storePatch: {},
        });

        const module: TestingModule = await Test.createTestingModule({
            providers: [
                AnalyticImpossibleTravelListUseCase,
                {
                    provide: AnalyticAnomalyService,
                    useValue: analyticAnomalyService,
                },
                { provide: AnalyticDateService, useValue: analyticDateService },
                { provide: PaginationQueryUtil, useValue: paginationQueryUtil },
                { provide: RequestStoreService, useValue: requestStoreService },
            ],
        }).compile();

        useCase = module.get(AnalyticImpossibleTravelListUseCase);
    });

    describe('execute', () => {
        it('hands the optional range and pagination to the domain', async () => {
            analyticDateService.optionalRange.mockReturnValue({
                startDate,
                endDate,
            });
            const page = {
                ...offsetPage,
                data: [
                    {
                        userId: 'user-1',
                        fromSessionId: 'session-1',
                        toSessionId: 'session-2',
                        distanceKm: 800,
                        deltaMs: 1000,
                    },
                ],
            };
            analyticAnomalyService.impossibleTravelList.mockResolvedValue(page);

            const result = await useCase.execute({
                startDate,
                endDate,
                page: 1,
                perPage: 20,
            });

            expect(result).toEqual(page);
            expect(
                analyticAnomalyService.impossibleTravelList
            ).toHaveBeenCalledWith(startDate, endDate, pagination);
            expect(paginationQueryUtil.offset).toHaveBeenCalledWith(
                expect.anything(),
                { availableOrderBy: AnalyticImpossibleTravelAvailableOrderBy }
            );
        });

        it('passes null dates when the optional range is empty', async () => {
            analyticDateService.optionalRange.mockReturnValue({
                startDate: null,
                endDate: null,
            });
            const page = {
                ...offsetPage,
                data: [
                    {
                        userId: 'user-1',
                        fromSessionId: 'session-1',
                        toSessionId: 'session-2',
                        distanceKm: 800,
                        deltaMs: 1000,
                    },
                ],
            };
            analyticAnomalyService.impossibleTravelList.mockResolvedValue(page);

            await useCase.execute({ page: 1, perPage: 20 });

            expect(
                analyticAnomalyService.impossibleTravelList
            ).toHaveBeenCalledWith(null, null, pagination);
        });
    });
});
