import { Test } from '@nestjs/testing';
import type { TestingModule } from '@nestjs/testing';
import { mock } from 'vitest-mock-extended';
import type { MockProxy } from 'vitest-mock-extended';
import { AnalyticAnomalyService } from '@modules/analytic/services/analytic.anomaly.service';
import { AnalyticLoginSpikeIpSummaryUseCase } from '@modules/analytic/use-cases/analytic.login-spike-ip-summary.use-case';

describe('AnalyticLoginSpikeIpSummaryUseCase', () => {
    const analyticAnomalyService: MockProxy<AnalyticAnomalyService> =
        mock<AnalyticAnomalyService>();

    const windowMs: number = 3600000;

    let useCase: AnalyticLoginSpikeIpSummaryUseCase;

    beforeEach(async () => {
        vi.resetAllMocks();

        const module: TestingModule = await Test.createTestingModule({
            providers: [
                AnalyticLoginSpikeIpSummaryUseCase,
                {
                    provide: AnalyticAnomalyService,
                    useValue: analyticAnomalyService,
                },
            ],
        }).compile();

        useCase = module.get(AnalyticLoginSpikeIpSummaryUseCase);
    });

    describe('execute', () => {
        it('wraps the domain result in the response envelope', async () => {
            analyticAnomalyService.loginSpikeIpSummary.mockResolvedValue({
                count: 4,
                window: '1h',
                meta: { minUniqueAccounts: 5 },
            });

            const result = await useCase.execute({ windowMs });

            expect(result).toEqual({
                data: {
                    count: 4,
                    window: '1h',
                    meta: { minUniqueAccounts: 5 },
                },
            });
            expect(
                analyticAnomalyService.loginSpikeIpSummary
            ).toHaveBeenCalledWith(windowMs);
        });

        it('passes null when windowMs is omitted', async () => {
            analyticAnomalyService.loginSpikeIpSummary.mockResolvedValue({
                count: 0,
                window: null,
                meta: { minUniqueAccounts: 5 },
            });

            await useCase.execute({});

            expect(
                analyticAnomalyService.loginSpikeIpSummary
            ).toHaveBeenCalledWith(null);
        });
    });
});
