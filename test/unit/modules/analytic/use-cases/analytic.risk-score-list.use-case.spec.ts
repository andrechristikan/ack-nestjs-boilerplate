import { ConfigService } from '@nestjs/config';
import { buildConfigService } from '@test/unit/helpers/test.unit.config.helper';
import {
    TestUnitKitConfigValues,
    TestUnitKitProviders,
} from '@test/unit/helpers/test.unit.kit.helper';
import { RequestStoreService } from '@common/request/services/request.store.service';
import {
    EnumPaginationOrderDirectionType,
    EnumPaginationType,
} from '@common/pagination/enums/pagination.enum';
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
import { AnalyticRiskScoreListUseCase } from '@modules/analytic/use-cases/analytic.risk-score-list.use-case';

describe('AnalyticRiskScoreListUseCase', () => {
    const analyticFraudService: MockProxy<AnalyticFraudService> =
        mock<AnalyticFraudService>();

    const requestStoreService: MockProxy<RequestStoreService> =
        mock<RequestStoreService>();

    const pagination: IPaginationQueryOffsetParams = {
        skip: 0,
        limit: 20,
        orderBy: [{ value: EnumPaginationOrderDirectionType.desc }],
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

    let useCase: AnalyticRiskScoreListUseCase;

    beforeEach(async () => {
        const module: TestingModule = await Test.createTestingModule({
            providers: [
                AnalyticRiskScoreListUseCase,
                {
                    provide: AnalyticFraudService,
                    useValue: analyticFraudService,
                },
                ...TestUnitKitProviders,
                {
                    provide: ConfigService,
                    useValue: buildConfigService(TestUnitKitConfigValues),
                },
                { provide: RequestStoreService, useValue: requestStoreService },
            ],
        }).compile();

        useCase = module.get(AnalyticRiskScoreListUseCase);
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
            analyticFraudService.getRiskScoreList.mockResolvedValue(page);

            const result = await useCase.execute({
                minScore: 30,
                page: 1,
                perPage: 20,
            });

            expect(result).toEqual(page);
            expect(analyticFraudService.getRiskScoreList).toHaveBeenCalledWith(
                30,
                pagination
            );
        });

        it('passes null when minScore is omitted', async () => {
            const page = { ...offsetPage, data: [] };
            analyticFraudService.getRiskScoreList.mockResolvedValue(page);

            await useCase.execute({
                minScore: undefined,
                page: 1,
                perPage: 20,
            });

            expect(analyticFraudService.getRiskScoreList).toHaveBeenCalledWith(
                null,
                pagination
            );
        });
    });
});
