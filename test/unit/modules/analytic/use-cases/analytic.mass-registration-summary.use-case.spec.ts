import { Test } from '@nestjs/testing';
import type { TestingModule } from '@nestjs/testing';
import { mock } from 'vitest-mock-extended';
import type { MockProxy } from 'vitest-mock-extended';
import { AnalyticFraudService } from '@modules/analytic/services/analytic.fraud.service';
import { AnalyticMassRegistrationSummaryUseCase } from '@modules/analytic/use-cases/analytic.mass-registration-summary.use-case';

describe('AnalyticMassRegistrationSummaryUseCase', () => {
    const analyticFraudService: MockProxy<AnalyticFraudService> =
        mock<AnalyticFraudService>();

    let useCase: AnalyticMassRegistrationSummaryUseCase;

    beforeEach(async () => {
        vi.resetAllMocks();

        const module: TestingModule = await Test.createTestingModule({
            providers: [
                AnalyticMassRegistrationSummaryUseCase,
                {
                    provide: AnalyticFraudService,
                    useValue: analyticFraudService,
                },
            ],
        }).compile();

        useCase = module.get(AnalyticMassRegistrationSummaryUseCase);
    });

    describe('execute', () => {
        it('wraps the domain result in the response envelope and passes no window to the service', async () => {
            analyticFraudService.massRegistrationSummary.mockResolvedValue({
                count: 6,
                windowStart: null,
                windowEnd: null,
                computedAt: null,
            });

            const result = await useCase.execute();

            expect(result).toEqual({
                data: {
                    count: 6,
                    windowStart: null,
                    windowEnd: null,
                    computedAt: null,
                },
            });
            expect(
                analyticFraudService.massRegistrationSummary
            ).toHaveBeenCalledWith();
        });
    });
});
