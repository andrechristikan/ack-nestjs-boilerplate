import { PaginationQueryUtil } from '@common/pagination/utils/pagination.query.util';
import { RequestStoreService } from '@common/request/services/request.store.service';
import { EnumPaginationType } from '@common/pagination/enums/pagination.enum';
import type { IPaginationQueryOffsetParams } from '@common/pagination/interfaces/pagination.interface';
import { Test } from '@nestjs/testing';
import type { TestingModule } from '@nestjs/testing';
import { mock } from 'vitest-mock-extended';
import type { MockProxy } from 'vitest-mock-extended';
import { AnalyticFraudService } from '@modules/analytic/services/analytic.fraud.service';
import { AnalyticUserCountAvailableOrderBy } from '@modules/analytic/constants/analytic.list.constant';
import { AnalyticApiKeyBurstListUseCase } from '@modules/analytic/use-cases/analytic.api-key-burst-list.use-case';

describe('AnalyticApiKeyBurstListUseCase', () => {
    const analyticFraudService: MockProxy<AnalyticFraudService> =
        mock<AnalyticFraudService>();

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

    let useCase: AnalyticApiKeyBurstListUseCase;

    beforeEach(async () => {
        vi.resetAllMocks();
        paginationQueryUtil.offset.mockReturnValue({
            params: pagination,
            storePatch: {},
        });

        const module: TestingModule = await Test.createTestingModule({
            providers: [
                AnalyticApiKeyBurstListUseCase,
                {
                    provide: AnalyticFraudService,
                    useValue: analyticFraudService,
                },
                { provide: PaginationQueryUtil, useValue: paginationQueryUtil },
                { provide: RequestStoreService, useValue: requestStoreService },
            ],
        }).compile();

        useCase = module.get(AnalyticApiKeyBurstListUseCase);
    });

    describe('execute', () => {
        it('hands the window and pagination to the domain', async () => {
            const page = {
                ...offsetPage,
                data: [{ userId: 'user-1', count: 9 }],
            };
            analyticFraudService.apiKeyBurstList.mockResolvedValue(page);

            const result = await useCase.execute({
                windowMs,
                page: 1,
                perPage: 20,
            });

            expect(result).toEqual(page);
            expect(analyticFraudService.apiKeyBurstList).toHaveBeenCalledWith(
                windowMs,
                pagination
            );
            expect(paginationQueryUtil.offset).toHaveBeenCalledWith(
                expect.anything(),
                { availableOrderBy: AnalyticUserCountAvailableOrderBy }
            );
        });

        it('passes null when windowMs is omitted', async () => {
            const page = { ...offsetPage, data: [] };
            analyticFraudService.apiKeyBurstList.mockResolvedValue(page);

            await useCase.execute({ page: 1, perPage: 20 });

            expect(analyticFraudService.apiKeyBurstList).toHaveBeenCalledWith(
                null,
                pagination
            );
        });
    });
});
