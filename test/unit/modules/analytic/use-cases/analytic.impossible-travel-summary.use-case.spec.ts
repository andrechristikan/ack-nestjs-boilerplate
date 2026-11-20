import { Test } from '@nestjs/testing';
import type { TestingModule } from '@nestjs/testing';
import { mock } from 'vitest-mock-extended';
import type { MockProxy } from 'vitest-mock-extended';
import { AnalyticAnomalyService } from '@modules/analytic/services/analytic.anomaly.service';
import { AnalyticImpossibleTravelSummaryUseCase } from '@modules/analytic/use-cases/analytic.impossible-travel-summary.use-case';

describe('AnalyticImpossibleTravelSummaryUseCase', () => {
    const analyticAnomalyService: MockProxy<AnalyticAnomalyService> =
        mock<AnalyticAnomalyService>();

    const windowStart = new Date('2025-12-02T00:00:00.000Z');

    const windowEnd = new Date('2026-01-01T00:00:00.000Z');

    const computedAt = new Date('2026-01-01T00:15:00.000Z');

    let useCase: AnalyticImpossibleTravelSummaryUseCase;

    beforeEach(async () => {
        const module: TestingModule = await Test.createTestingModule({
            providers: [
                AnalyticImpossibleTravelSummaryUseCase,
                {
                    provide: AnalyticAnomalyService,
                    useValue: analyticAnomalyService,
                },
            ],
        }).compile();

        useCase = module.get(AnalyticImpossibleTravelSummaryUseCase);
    });

    describe('execute', () => {
        it('wraps the domain result in the response envelope', async () => {
            const summary = {
                count: 6,
                windowStart,
                windowEnd,
                computedAt,
                metadata: { minDistanceKm: 500, maxDeltaInMs: 3600000 },
            };
            analyticAnomalyService.impossibleTravelSummary.mockResolvedValue(
                summary
            );

            const result = await useCase.execute();

            expect(result).toEqual({ data: summary });
            expect(
                analyticAnomalyService.impossibleTravelSummary
            ).toHaveBeenCalledWith();
        });
    });
});
