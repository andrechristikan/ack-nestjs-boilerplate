import { PaginationQueryUtil } from '@common/pagination/utils/pagination.query.util';
import { RequestStoreService } from '@common/request/services/request.store.service';
import { EnumPaginationType } from '@common/pagination/enums/pagination.enum';
import type { IPaginationQueryOffsetParams } from '@common/pagination/interfaces/pagination.interface';
import { Test } from '@nestjs/testing';
import type { TestingModule } from '@nestjs/testing';
import { mock } from 'vitest-mock-extended';
import type { MockProxy } from 'vitest-mock-extended';
import {
    EnumAnalyticFraudBand,
    EnumAnalyticFraudContributingSignal,
} from '@modules/analytic/enums/analytic.enum';
import { AnalyticFraudService } from '@modules/analytic/services/analytic.fraud.service';
import { AnalyticFraudRiskScoreAvailableOrderBy } from '@modules/analytic/constants/analytic.list.constant';
import { AnalyticRiskScoresUseCase } from '@modules/analytic/use-cases/analytic.risk-scores.use-case';

describe('AnalyticRiskScoresUseCase', () => {
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

    let useCase: AnalyticRiskScoresUseCase;

    beforeEach(async () => {
        vi.resetAllMocks();
        paginationQueryUtil.offset.mockReturnValue({
            params: pagination,
            storePatch: {},
        });

        const module: TestingModule = await Test.createTestingModule({
            providers: [
                AnalyticRiskScoresUseCase,
                {
                    provide: AnalyticFraudService,
                    useValue: analyticFraudService,
                },
                { provide: PaginationQueryUtil, useValue: paginationQueryUtil },
                { provide: RequestStoreService, useValue: requestStoreService },
            ],
        }).compile();

        useCase = module.get(AnalyticRiskScoresUseCase);
    });

    describe('execute', () => {
        it('hands the minScore and pagination to the domain', async () => {
            const page = {
                ...offsetPage,
                data: [
                    {
                        userId: 'user-1',
                        score: 42,
                        band: EnumAnalyticFraudBand.review,
                        contributingSignalCodes: [
                            EnumAnalyticFraudContributingSignal.nearLockout,
                        ],
                    },
                ],
            };
            analyticFraudService.riskScores.mockResolvedValue(page);

            const result = await useCase.execute({
                minScore: 30,
                page: 1,
                perPage: 20,
            });

            expect(result).toEqual(page);
            expect(analyticFraudService.riskScores).toHaveBeenCalledWith(
                30,
                pagination
            );
            expect(paginationQueryUtil.offset).toHaveBeenCalledWith(
                expect.anything(),
                { availableOrderBy: AnalyticFraudRiskScoreAvailableOrderBy }
            );
        });

        it('passes null when minScore is omitted', async () => {
            const page = { ...offsetPage, data: [] };
            analyticFraudService.riskScores.mockResolvedValue(page);

            await useCase.execute({
                minScore: undefined,
                page: 1,
                perPage: 20,
            });

            expect(analyticFraudService.riskScores).toHaveBeenCalledWith(
                null,
                pagination
            );
        });
    });
});
