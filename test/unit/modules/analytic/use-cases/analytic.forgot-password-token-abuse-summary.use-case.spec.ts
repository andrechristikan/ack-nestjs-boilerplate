import { Test } from '@nestjs/testing';
import type { TestingModule } from '@nestjs/testing';
import { mock } from 'vitest-mock-extended';
import type { MockProxy } from 'vitest-mock-extended';
import { AnalyticFraudService } from '@modules/analytic/services/analytic.fraud.service';
import { AnalyticForgotPasswordTokenAbuseSummaryUseCase } from '@modules/analytic/use-cases/analytic.forgot-password-token-abuse-summary.use-case';

describe('AnalyticForgotPasswordTokenAbuseSummaryUseCase', () => {
    const analyticFraudService: MockProxy<AnalyticFraudService> =
        mock<AnalyticFraudService>();

    let useCase: AnalyticForgotPasswordTokenAbuseSummaryUseCase;

    beforeEach(async () => {
        const module: TestingModule = await Test.createTestingModule({
            providers: [
                AnalyticForgotPasswordTokenAbuseSummaryUseCase,
                {
                    provide: AnalyticFraudService,
                    useValue: analyticFraudService,
                },
            ],
        }).compile();

        useCase = module.get(AnalyticForgotPasswordTokenAbuseSummaryUseCase);
    });

    describe('execute', () => {
        it('wraps the domain result in the response envelope and passes no window to the service', async () => {
            analyticFraudService.getForgotPasswordTokenAbuseSummary.mockResolvedValue(
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
                analyticFraudService.getForgotPasswordTokenAbuseSummary
            ).toHaveBeenCalledWith();
        });
    });
});
