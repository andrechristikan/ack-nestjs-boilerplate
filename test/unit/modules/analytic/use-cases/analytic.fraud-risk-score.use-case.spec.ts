import { Test } from '@nestjs/testing';
import type { TestingModule } from '@nestjs/testing';
import { mock } from 'vitest-mock-extended';
import type { MockProxy } from 'vitest-mock-extended';
import {
    EnumAnalyticFraudBand,
    EnumAnalyticFraudContributingSignal,
} from '@modules/analytic/enums/analytic.enum';
import { AnalyticFraudService } from '@modules/analytic/services/analytic.fraud.service';
import { AnalyticFraudRiskScoreUseCase } from '@modules/analytic/use-cases/analytic.fraud-risk-score.use-case';

describe('AnalyticFraudRiskScoreUseCase', () => {
    const analyticFraudService: MockProxy<AnalyticFraudService> =
        mock<AnalyticFraudService>();

    let useCase: AnalyticFraudRiskScoreUseCase;

    beforeEach(async () => {
        const module: TestingModule = await Test.createTestingModule({
            providers: [
                AnalyticFraudRiskScoreUseCase,
                {
                    provide: AnalyticFraudService,
                    useValue: analyticFraudService,
                },
            ],
        }).compile();

        useCase = module.get(AnalyticFraudRiskScoreUseCase);
    });

    describe('execute', () => {
        it('wraps the domain result in the response envelope', async () => {
            const computedAt = new Date('2026-03-01T00:15:00.000Z');
            analyticFraudService.getFraudRiskScore.mockResolvedValue({
                userId: 'user-1',
                score: 42,
                band: EnumAnalyticFraudBand.review,
                contributingSignalCodes: [
                    EnumAnalyticFraudContributingSignal.sharedFingerprint,
                ],
                computedAt,
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
                    computedAt,
                },
            });
            expect(analyticFraudService.getFraudRiskScore).toHaveBeenCalledWith(
                'user-1'
            );
        });
    });
});
