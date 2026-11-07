import { Test } from '@nestjs/testing';
import type { TestingModule } from '@nestjs/testing';
import { mock } from 'vitest-mock-extended';
import type { MockProxy } from 'vitest-mock-extended';
import { AnalyticAnomalyService } from '@modules/analytic/services/analytic.anomaly.service';
import { AnalyticDateService } from '@modules/analytic/services/analytic.date.service';
import { AnalyticImpossibleTravelSummaryUseCase } from '@modules/analytic/use-cases/analytic.impossible-travel-summary.use-case';

describe('AnalyticImpossibleTravelSummaryUseCase', () => {
    const analyticAnomalyService: MockProxy<AnalyticAnomalyService> =
        mock<AnalyticAnomalyService>();

    const analyticDateService: MockProxy<AnalyticDateService> =
        mock<AnalyticDateService>();

    const startDate: Date = new Date('2026-01-01T00:00:00.000Z');

    const endDate: Date = new Date('2026-02-01T00:00:00.000Z');

    let useCase: AnalyticImpossibleTravelSummaryUseCase;

    beforeEach(async () => {
        vi.resetAllMocks();

        const module: TestingModule = await Test.createTestingModule({
            providers: [
                AnalyticImpossibleTravelSummaryUseCase,
                {
                    provide: AnalyticAnomalyService,
                    useValue: analyticAnomalyService,
                },
                { provide: AnalyticDateService, useValue: analyticDateService },
            ],
        }).compile();

        useCase = module.get(AnalyticImpossibleTravelSummaryUseCase);
    });

    describe('execute', () => {
        it('wraps the domain result in the response envelope', async () => {
            analyticDateService.optionalRange.mockReturnValue({
                startDate,
                endDate,
            });
            analyticAnomalyService.impossibleTravelSummary.mockResolvedValue({
                count: 4,
                window: '1h',
                meta: { minDistanceKm: 100, maxDeltaInMs: 600000 },
            });

            const result = await useCase.execute({
                startDate,
                endDate,
            });

            expect(analyticDateService.optionalRange).toHaveBeenCalledWith(
                startDate,
                endDate
            );

            expect(result).toEqual({
                data: {
                    count: 4,
                    window: '1h',
                    meta: { minDistanceKm: 100, maxDeltaInMs: 600000 },
                },
            });
            expect(
                analyticAnomalyService.impossibleTravelSummary
            ).toHaveBeenCalledWith(startDate, endDate);
        });

        it('passes null dates when the optional range is empty', async () => {
            analyticDateService.optionalRange.mockReturnValue({
                startDate: null,
                endDate: null,
            });
            analyticAnomalyService.impossibleTravelSummary.mockResolvedValue({
                count: 0,
                window: null,
                meta: { minDistanceKm: 100, maxDeltaInMs: 600000 },
            });

            await useCase.execute({});

            expect(analyticDateService.optionalRange).toHaveBeenCalledWith(
                null,
                null
            );

            expect(
                analyticAnomalyService.impossibleTravelSummary
            ).toHaveBeenCalledWith(null, null);
        });
    });
});
