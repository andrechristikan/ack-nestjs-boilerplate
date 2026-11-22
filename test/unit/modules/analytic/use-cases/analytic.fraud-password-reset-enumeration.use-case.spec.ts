import { Test } from '@nestjs/testing';
import type { TestingModule } from '@nestjs/testing';
import { mock } from 'vitest-mock-extended';
import type { MockProxy } from 'vitest-mock-extended';
import { AnalyticFraudService } from '@modules/analytic/services/analytic.fraud.service';
import { AnalyticFraudPasswordResetEnumerationUseCase } from '@modules/analytic/use-cases/analytic.fraud-password-reset-enumeration.use-case';

describe('AnalyticFraudPasswordResetEnumerationUseCase', () => {
    const analyticFraudService: MockProxy<AnalyticFraudService> =
        mock<AnalyticFraudService>();

    let useCase: AnalyticFraudPasswordResetEnumerationUseCase;

    beforeEach(async () => {
        const module: TestingModule = await Test.createTestingModule({
            providers: [
                AnalyticFraudPasswordResetEnumerationUseCase,
                {
                    provide: AnalyticFraudService,
                    useValue: analyticFraudService,
                },
            ],
        }).compile();

        useCase = module.get(AnalyticFraudPasswordResetEnumerationUseCase);
    });

    describe('execute', () => {
        it('wraps the domain result in the response envelope and passes no window to the service', async () => {
            analyticFraudService.getFraudPasswordResetEnumeration.mockResolvedValue(
                {
                    count: 6,
                    windowStart: null,
                    windowEnd: null,
                    computedAt: null,
                }
            );

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
                analyticFraudService.getFraudPasswordResetEnumeration
            ).toHaveBeenCalledWith();
        });
    });
});
