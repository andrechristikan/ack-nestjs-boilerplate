import { Test } from '@nestjs/testing';
import type { TestingModule } from '@nestjs/testing';
import { mock } from 'vitest-mock-extended';
import type { MockProxy } from 'vitest-mock-extended';
import { AnalyticAnomalyService } from '@modules/analytic/services/analytic.anomaly.service';
import { AnalyticAnomalyFailedLoginSpikeUseCase } from '@modules/analytic/use-cases/analytic.anomaly-failed-login-spike.use-case';

describe('AnalyticAnomalyFailedLoginSpikeUseCase', () => {
    const analyticAnomalyService: MockProxy<AnalyticAnomalyService> =
        mock<AnalyticAnomalyService>();

    let useCase: AnalyticAnomalyFailedLoginSpikeUseCase;

    beforeEach(async () => {
        const module: TestingModule = await Test.createTestingModule({
            providers: [
                AnalyticAnomalyFailedLoginSpikeUseCase,
                {
                    provide: AnalyticAnomalyService,
                    useValue: analyticAnomalyService,
                },
            ],
        }).compile();

        useCase = module.get(AnalyticAnomalyFailedLoginSpikeUseCase);
    });

    describe('execute', () => {
        it('wraps the domain result in the response envelope', async () => {
            analyticAnomalyService.getAnomalyFailedLoginSpike.mockResolvedValue(
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
                analyticAnomalyService.getAnomalyFailedLoginSpike
            ).toHaveBeenCalledWith();
        });
    });
});
