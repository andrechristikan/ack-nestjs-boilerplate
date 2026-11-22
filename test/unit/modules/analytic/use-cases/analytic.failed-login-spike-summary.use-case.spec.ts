import { Test } from '@nestjs/testing';
import type { TestingModule } from '@nestjs/testing';
import { mock } from 'vitest-mock-extended';
import type { MockProxy } from 'vitest-mock-extended';
import { AnalyticAnomalyService } from '@modules/analytic/services/analytic.anomaly.service';
import { AnalyticFailedLoginSpikeSummaryUseCase } from '@modules/analytic/use-cases/analytic.failed-login-spike-summary.use-case';

describe('AnalyticFailedLoginSpikeSummaryUseCase', () => {
    const analyticAnomalyService: MockProxy<AnalyticAnomalyService> =
        mock<AnalyticAnomalyService>();

    let useCase: AnalyticFailedLoginSpikeSummaryUseCase;

    beforeEach(async () => {
        const module: TestingModule = await Test.createTestingModule({
            providers: [
                AnalyticFailedLoginSpikeSummaryUseCase,
                {
                    provide: AnalyticAnomalyService,
                    useValue: analyticAnomalyService,
                },
            ],
        }).compile();

        useCase = module.get(AnalyticFailedLoginSpikeSummaryUseCase);
    });

    describe('execute', () => {
        it('wraps the domain result in the response envelope', async () => {
            analyticAnomalyService.getFailedLoginSpikeSummary.mockResolvedValue(
                {
                    count: 4,
                    windowStart: null,
                    windowEnd: null,
                    computedAt: null,
                    metadata: { nearLockoutMinAttempt: 4 },
                }
            );

            const result = await useCase.execute();

            expect(result).toEqual({
                data: {
                    count: 4,
                    windowStart: null,
                    windowEnd: null,
                    computedAt: null,
                    metadata: { nearLockoutMinAttempt: 4 },
                },
            });
            expect(
                analyticAnomalyService.getFailedLoginSpikeSummary
            ).toHaveBeenCalledWith();
        });
    });
});
