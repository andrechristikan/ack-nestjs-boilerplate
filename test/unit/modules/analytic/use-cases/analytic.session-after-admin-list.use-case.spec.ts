import { PaginationQueryUtil } from '@common/pagination/utils/pagination.query.util';
import { RequestStoreService } from '@common/request/services/request.store.service';
import { EnumPaginationType } from '@common/pagination/enums/pagination.enum';
import type { IPaginationQueryOffsetParams } from '@common/pagination/interfaces/pagination.interface';
import { Test } from '@nestjs/testing';
import type { TestingModule } from '@nestjs/testing';
import { mock } from 'vitest-mock-extended';
import type { MockProxy } from 'vitest-mock-extended';
import { AnalyticFraudService } from '@modules/analytic/services/analytic.fraud.service';
import { AnalyticSessionAfterAdminOrderBy } from '@modules/analytic/constants/analytic.list.constant';
import { AnalyticSessionAfterAdminListUseCase } from '@modules/analytic/use-cases/analytic.session-after-admin-list.use-case';
import { EnumAnalyticSessionAfterAdminOrderBy } from '@modules/analytic/enums/analytic.enum';

describe('AnalyticSessionAfterAdminListUseCase', () => {
    const analyticFraudService: MockProxy<AnalyticFraudService> =
        mock<AnalyticFraudService>();

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

    const computedAt = new Date('2026-01-01T00:15:00.000Z');

    let useCase: AnalyticSessionAfterAdminListUseCase;

    beforeEach(async () => {
        vi.resetAllMocks();
        paginationQueryUtil.offset.mockReturnValue({
            params: pagination,
            storePatch: {},
        });

        const module: TestingModule = await Test.createTestingModule({
            providers: [
                AnalyticSessionAfterAdminListUseCase,
                {
                    provide: AnalyticFraudService,
                    useValue: analyticFraudService,
                },
                { provide: PaginationQueryUtil, useValue: paginationQueryUtil },
                { provide: RequestStoreService, useValue: requestStoreService },
            ],
        }).compile();

        useCase = module.get(AnalyticSessionAfterAdminListUseCase);
    });

    describe('execute', () => {
        it('hands pagination to the domain', async () => {
            const page = {
                ...offsetPage,
                data: [
                    {
                        userId: 'user-1',
                        revokedAt: computedAt,
                        loginAt: computedAt,
                    },
                ],
            };
            analyticFraudService.sessionAfterAdminList.mockResolvedValue(page);

            const result = await useCase.execute({
                page: 1,
                perPage: 20,
            });

            expect(result).toEqual(page);
            expect(
                analyticFraudService.sessionAfterAdminList
            ).toHaveBeenCalledWith(pagination);
            expect(paginationQueryUtil.offset).toHaveBeenCalledWith(
                expect.anything(),
                {
                    orderBy: AnalyticSessionAfterAdminOrderBy,
                    defaultOrderBy: EnumAnalyticSessionAfterAdminOrderBy.latest,
                }
            );
        });
    });
});
