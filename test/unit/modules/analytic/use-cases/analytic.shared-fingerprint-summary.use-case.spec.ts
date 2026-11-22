import { Test } from '@nestjs/testing';
import type { TestingModule } from '@nestjs/testing';
import { mock } from 'vitest-mock-extended';
import type { MockProxy } from 'vitest-mock-extended';
import { AnalyticFraudService } from '@modules/analytic/services/analytic.fraud.service';
import { AnalyticSharedFingerprintSummaryUseCase } from '@modules/analytic/use-cases/analytic.shared-fingerprint-summary.use-case';

describe('AnalyticSharedFingerprintSummaryUseCase', () => {
    const analyticFraudService: MockProxy<AnalyticFraudService> =
        mock<AnalyticFraudService>();

    let useCase: AnalyticSharedFingerprintSummaryUseCase;

    beforeEach(async () => {
        vi.resetAllMocks();

        const module: TestingModule = await Test.createTestingModule({
            providers: [
                AnalyticSharedFingerprintSummaryUseCase,
                {
                    provide: AnalyticFraudService,
                    useValue: analyticFraudService,
                },
            ],
        }).compile();

        useCase = module.get(AnalyticSharedFingerprintSummaryUseCase);
    });

    describe('execute', () => {
        it('wraps the domain result in the response envelope', async () => {
            analyticFraudService.sharedFingerprintSummary.mockResolvedValue({
                count: 6,
                window: '24h',
            });

            const result = await useCase.execute();

            expect(result).toEqual({
                data: {
                    count: 6,
                    window: '24h',
                },
            });
            expect(
                analyticFraudService.sharedFingerprintSummary
            ).toHaveBeenCalledWith();
        });
    });
});
