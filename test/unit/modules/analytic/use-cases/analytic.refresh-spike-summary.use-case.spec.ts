import { Test } from '@nestjs/testing';
import type { TestingModule } from '@nestjs/testing';
import { mock } from 'vitest-mock-extended';
import type { MockProxy } from 'vitest-mock-extended';
import { AnalyticFraudService } from '@modules/analytic/services/analytic.fraud.service';
import { AnalyticRefreshSpikeSummaryUseCase } from '@modules/analytic/use-cases/analytic.refresh-spike-summary.use-case';

describe('AnalyticRefreshSpikeSummaryUseCase', () => {
    const analyticFraudService: MockProxy<AnalyticFraudService> =
        mock<AnalyticFraudService>();

    const windowMs: number = 3600000;

    let useCase: AnalyticRefreshSpikeSummaryUseCase;

    beforeEach(async () => {
        vi.resetAllMocks();

        const module: TestingModule = await Test.createTestingModule({
            providers: [
                AnalyticRefreshSpikeSummaryUseCase,
                {
                    provide: AnalyticFraudService,
                    useValue: analyticFraudService,
                },
            ],
        }).compile();

        useCase = module.get(AnalyticRefreshSpikeSummaryUseCase);
    });

    describe('execute', () => {
        it('wraps the domain result in the response envelope', async () => {
            analyticFraudService.refreshSpikeSummary.mockResolvedValue({
                count: 6,
                window: '24h',
            });

            const result = await useCase.execute({ windowMs });

            expect(result).toEqual({
                data: {
                    count: 6,
                    window: '24h',
                },
            });
            expect(
                analyticFraudService.refreshSpikeSummary
            ).toHaveBeenCalledWith(windowMs);
        });

        it('passes null when windowMs is omitted', async () => {
            analyticFraudService.refreshSpikeSummary.mockResolvedValue({
                count: 0,
                window: null,
            });

            await useCase.execute({});

            expect(
                analyticFraudService.refreshSpikeSummary
            ).toHaveBeenCalledWith(null);
        });
    });
});
