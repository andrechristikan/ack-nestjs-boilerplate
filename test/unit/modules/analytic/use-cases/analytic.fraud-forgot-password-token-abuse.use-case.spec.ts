import { Test } from '@nestjs/testing';
import type { TestingModule } from '@nestjs/testing';
import { mock } from 'vitest-mock-extended';
import type { MockProxy } from 'vitest-mock-extended';
import { AnalyticFraudService } from '@modules/analytic/services/analytic.fraud.service';
import { AnalyticFraudForgotPasswordTokenAbuseUseCase } from '@modules/analytic/use-cases/analytic.fraud-forgot-password-token-abuse.use-case';

describe('AnalyticFraudForgotPasswordTokenAbuseUseCase', () => {
    const analyticFraudService: MockProxy<AnalyticFraudService> =
        mock<AnalyticFraudService>();

    let useCase: AnalyticFraudForgotPasswordTokenAbuseUseCase;

    beforeEach(async () => {
        const module: TestingModule = await Test.createTestingModule({
            providers: [
                AnalyticFraudForgotPasswordTokenAbuseUseCase,
                {
                    provide: AnalyticFraudService,
                    useValue: analyticFraudService,
                },
            ],
        }).compile();

        useCase = module.get(AnalyticFraudForgotPasswordTokenAbuseUseCase);
    });

    describe('execute', () => {
        it('wraps the domain result in the response envelope and passes no window to the service', async () => {
            analyticFraudService.getFraudForgotPasswordTokenAbuse.mockResolvedValue(
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
                analyticFraudService.getFraudForgotPasswordTokenAbuse
            ).toHaveBeenCalledWith();
        });
    });
});
