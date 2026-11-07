import { PaginationQueryUtil } from '@common/pagination/utils/pagination.query.util';
import { RequestStoreService } from '@common/request/services/request.store.service';
import { EnumPaginationType } from '@common/pagination/enums/pagination.enum';
import type { IPaginationQueryOffsetParams } from '@common/pagination/interfaces/pagination.interface';
import { Test } from '@nestjs/testing';
import type { TestingModule } from '@nestjs/testing';
import { mock } from 'vitest-mock-extended';
import type { MockProxy } from 'vitest-mock-extended';
import { AnalyticAnomalyService } from '@modules/analytic/services/analytic.anomaly.service';
import { AnalyticLoginSpikeIpAvailableOrderBy } from '@modules/analytic/constants/analytic.list.constant';
import { AnalyticLoginSpikeIpListUseCase } from '@modules/analytic/use-cases/analytic.login-spike-ip-list.use-case';

describe('AnalyticLoginSpikeIpListUseCase', () => {
    const analyticAnomalyService: MockProxy<AnalyticAnomalyService> =
        mock<AnalyticAnomalyService>();

    const paginationQueryUtil: MockProxy<PaginationQueryUtil> =
        mock<PaginationQueryUtil>();

    const requestStoreService: MockProxy<RequestStoreService> =
        mock<RequestStoreService>();

    const windowMs: number = 3600000;

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

    let useCase: AnalyticLoginSpikeIpListUseCase;

    beforeEach(async () => {
        vi.resetAllMocks();
        paginationQueryUtil.offset.mockReturnValue({
            params: pagination,
            storePatch: {},
        });

        const module: TestingModule = await Test.createTestingModule({
            providers: [
                AnalyticLoginSpikeIpListUseCase,
                {
                    provide: AnalyticAnomalyService,
                    useValue: analyticAnomalyService,
                },
                { provide: PaginationQueryUtil, useValue: paginationQueryUtil },
                { provide: RequestStoreService, useValue: requestStoreService },
            ],
        }).compile();

        useCase = module.get(AnalyticLoginSpikeIpListUseCase);
    });

    describe('execute', () => {
        it('hands the window and pagination to the domain', async () => {
            const page = {
                ...offsetPage,
                data: [
                    {
                        ipAddress: '10.0.0.1',
                        uniqueUsers: 5,
                        attempts: 9,
                    },
                ],
            };
            analyticAnomalyService.loginSpikeIpList.mockResolvedValue(page);

            const result = await useCase.execute({
                windowMs,
                page: 1,
                perPage: 20,
            });

            expect(result).toEqual(page);
            expect(
                analyticAnomalyService.loginSpikeIpList
            ).toHaveBeenCalledWith(windowMs, pagination);
            expect(paginationQueryUtil.offset).toHaveBeenCalledWith(
                expect.anything(),
                { availableOrderBy: AnalyticLoginSpikeIpAvailableOrderBy }
            );
        });

        it('passes null when windowMs is omitted', async () => {
            const page = {
                ...offsetPage,
                data: [
                    {
                        ipAddress: '10.0.0.1',
                        uniqueUsers: 5,
                        attempts: 9,
                    },
                ],
            };
            analyticAnomalyService.loginSpikeIpList.mockResolvedValue(page);

            await useCase.execute({ page: 1, perPage: 20 });

            expect(
                analyticAnomalyService.loginSpikeIpList
            ).toHaveBeenCalledWith(null, pagination);
        });
    });
});
