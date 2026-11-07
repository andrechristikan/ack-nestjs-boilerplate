import { PaginationQueryUtil } from '@common/pagination/utils/pagination.query.util';
import { RequestStoreService } from '@common/request/services/request.store.service';
import { EnumPaginationType } from '@common/pagination/enums/pagination.enum';
import type { IPaginationQueryOffsetParams } from '@common/pagination/interfaces/pagination.interface';
import { Test } from '@nestjs/testing';
import type { TestingModule } from '@nestjs/testing';
import { mock } from 'vitest-mock-extended';
import type { MockProxy } from 'vitest-mock-extended';
import { AnalyticAnomalyService } from '@modules/analytic/services/analytic.anomaly.service';
import { AnalyticNearLockoutAvailableOrderBy } from '@modules/analytic/constants/analytic.list.constant';
import { AnalyticFailedLoginSpikeListUseCase } from '@modules/analytic/use-cases/analytic.failed-login-spike-list.use-case';

describe('AnalyticFailedLoginSpikeListUseCase', () => {
    const analyticAnomalyService: MockProxy<AnalyticAnomalyService> =
        mock<AnalyticAnomalyService>();

    const paginationQueryUtil: MockProxy<PaginationQueryUtil> =
        mock<PaginationQueryUtil>();

    const requestStoreService: MockProxy<RequestStoreService> =
        mock<RequestStoreService>();

    const startDate: Date = new Date('2026-01-01T00:00:00.000Z');

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

    let useCase: AnalyticFailedLoginSpikeListUseCase;

    beforeEach(async () => {
        vi.resetAllMocks();
        paginationQueryUtil.offset.mockReturnValue({
            params: pagination,
            storePatch: {},
        });

        const module: TestingModule = await Test.createTestingModule({
            providers: [
                AnalyticFailedLoginSpikeListUseCase,
                {
                    provide: AnalyticAnomalyService,
                    useValue: analyticAnomalyService,
                },
                { provide: PaginationQueryUtil, useValue: paginationQueryUtil },
                { provide: RequestStoreService, useValue: requestStoreService },
            ],
        }).compile();

        useCase = module.get(AnalyticFailedLoginSpikeListUseCase);
    });

    describe('execute', () => {
        it('hands pagination to the domain', async () => {
            const page = {
                ...offsetPage,
                data: [
                    {
                        id: 'user-1',
                        email: 'user@example.com',
                        passwordAttempt: 4,
                        lastLoginAt: startDate,
                        createdAt: startDate,
                    },
                ],
            };
            analyticAnomalyService.failedLoginSpikeList.mockResolvedValue(page);

            const result = await useCase.execute({
                page: 1,
                perPage: 20,
            });

            expect(result).toEqual(page);
            expect(
                analyticAnomalyService.failedLoginSpikeList
            ).toHaveBeenCalledWith(pagination);
            expect(paginationQueryUtil.offset).toHaveBeenCalledWith(
                expect.anything(),
                { availableOrderBy: AnalyticNearLockoutAvailableOrderBy }
            );
        });
    });
});
