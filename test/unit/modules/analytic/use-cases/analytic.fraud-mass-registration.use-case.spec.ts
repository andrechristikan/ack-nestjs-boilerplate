import { Test } from '@nestjs/testing';
import type { TestingModule } from '@nestjs/testing';
import { mock } from 'vitest-mock-extended';
import type { MockProxy } from 'vitest-mock-extended';
import { AnalyticFraudService } from '@modules/analytic/services/analytic.fraud.service';
import { AnalyticFraudMassRegistrationUseCase } from '@modules/analytic/use-cases/analytic.fraud-mass-registration.use-case';

describe('AnalyticFraudMassRegistrationUseCase', () => {
    const analyticFraudService: MockProxy<AnalyticFraudService> =
        mock<AnalyticFraudService>();

    let useCase: AnalyticFraudMassRegistrationUseCase;

    beforeEach(async () => {
        const module: TestingModule = await Test.createTestingModule({
            providers: [
                AnalyticFraudMassRegistrationUseCase,
                {
                    provide: AnalyticFraudService,
                    useValue: analyticFraudService,
                },
            ],
        }).compile();

        useCase = module.get(AnalyticFraudMassRegistrationUseCase);
    });

    describe('execute', () => {
        it('wraps the domain result in the response envelope and passes no window to the service', async () => {
            analyticFraudService.getFraudMassRegistration.mockResolvedValue({
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
                analyticFraudService.getFraudMassRegistration
            ).toHaveBeenCalledWith();
        });
    });
});
