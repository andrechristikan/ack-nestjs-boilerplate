import { PaginationQueryUtil } from '@common/pagination/utils/pagination.query.util';
import { RequestStoreService } from '@common/request/services/request.store.service';
import { EnumPaginationType } from '@common/pagination/enums/pagination.enum';
import type { IPaginationQueryOffsetParams } from '@common/pagination/interfaces/pagination.interface';
import { Test } from '@nestjs/testing';
import type { TestingModule } from '@nestjs/testing';
import { mock } from 'vitest-mock-extended';
import type { MockProxy } from 'vitest-mock-extended';
import { AnalyticFraudService } from '@modules/analytic/services/analytic.fraud.service';
import { AnalyticSharedFingerprintAvailableOrderBy } from '@modules/analytic/constants/analytic.list.constant';
import { AnalyticSharedFingerprintListUseCase } from '@modules/analytic/use-cases/analytic.shared-fingerprint-list.use-case';

describe('AnalyticSharedFingerprintListUseCase', () => {
    const analyticFraudService: MockProxy<AnalyticFraudService> =
        mock<AnalyticFraudService>();

    const paginationQueryUtil: MockProxy<PaginationQueryUtil> =
        mock<PaginationQueryUtil>();

    const requestStoreService: MockProxy<RequestStoreService> =
        mock<RequestStoreService>();

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

    let useCase: AnalyticSharedFingerprintListUseCase;

    beforeEach(async () => {
        vi.resetAllMocks();
        paginationQueryUtil.offset.mockReturnValue({
            params: pagination,
            storePatch: {},
        });

        const module: TestingModule = await Test.createTestingModule({
            providers: [
                AnalyticSharedFingerprintListUseCase,
                {
                    provide: AnalyticFraudService,
                    useValue: analyticFraudService,
                },
                { provide: PaginationQueryUtil, useValue: paginationQueryUtil },
                { provide: RequestStoreService, useValue: requestStoreService },
            ],
        }).compile();

        useCase = module.get(AnalyticSharedFingerprintListUseCase);
    });

    describe('execute', () => {
        it('hands pagination to the domain', async () => {
            const page = {
                ...offsetPage,
                data: [
                    {
                        fingerprint: 'fp-1',
                        userCount: 3,
                        userIds: ['user-1', 'user-2', 'user-3'],
                    },
                ],
            };
            analyticFraudService.sharedFingerprintList.mockResolvedValue(page);

            const result = await useCase.execute({
                page: 1,
                perPage: 20,
            });

            expect(result).toEqual(page);
            expect(
                analyticFraudService.sharedFingerprintList
            ).toHaveBeenCalledWith(pagination);
            expect(paginationQueryUtil.offset).toHaveBeenCalledWith(
                expect.anything(),
                { availableOrderBy: AnalyticSharedFingerprintAvailableOrderBy }
            );
        });
    });
});
