import { Test } from '@nestjs/testing';
import type { TestingModule } from '@nestjs/testing';
import { mock } from 'vitest-mock-extended';
import type { MockProxy } from 'vitest-mock-extended';
import {
    EnumAnalyticFraudBand,
    EnumAnalyticFraudContributingSignal,
} from '@modules/analytic/enums/analytic.enum';
import { AnalyticFraudService } from '@modules/analytic/services/analytic.fraud.service';
import { AnalyticRiskScoreUseCase } from '@modules/analytic/use-cases/analytic.risk-score.use-case';

describe('AnalyticRiskScoreUseCase', () => {
    const analyticFraudService: MockProxy<AnalyticFraudService> =
        mock<AnalyticFraudService>();

    let useCase: AnalyticRiskScoreUseCase;

    beforeEach(async () => {
        vi.resetAllMocks();

        const module: TestingModule = await Test.createTestingModule({
            providers: [
                AnalyticRiskScoreUseCase,
                {
                    provide: AnalyticFraudService,
                    useValue: analyticFraudService,
                },
            ],
        }).compile();

        useCase = module.get(AnalyticRiskScoreUseCase);
    });

    describe('execute', () => {
        it('wraps the domain result in the response envelope', async () => {
            analyticFraudService.riskScore.mockResolvedValue({
                userId: 'user-1',
                score: 42,
                band: EnumAnalyticFraudBand.review,
                contributingSignalCodes: [
                    EnumAnalyticFraudContributingSignal.sharedFingerprint,
                ],
            });

            const result = await useCase.execute('user-1');

            expect(result).toEqual({
                data: {
                    userId: 'user-1',
                    score: 42,
                    band: EnumAnalyticFraudBand.review,
                    contributingSignalCodes: [
                        EnumAnalyticFraudContributingSignal.sharedFingerprint,
                    ],
                },
            });
            expect(analyticFraudService.riskScore).toHaveBeenCalledWith(
                'user-1'
            );
        });
    });
});
