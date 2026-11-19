import { Test } from '@nestjs/testing';
import type { TestingModule } from '@nestjs/testing';
import { mock } from 'vitest-mock-extended';
import type { MockProxy } from 'vitest-mock-extended';
import { AnalyticAnomalyService } from '@modules/analytic/services/analytic.anomaly.service';
import { AnalyticDeviceProliferationSummaryUseCase } from '@modules/analytic/use-cases/analytic.device-proliferation-summary.use-case';

describe('AnalyticDeviceProliferationSummaryUseCase', () => {
    const analyticAnomalyService: MockProxy<AnalyticAnomalyService> =
        mock<AnalyticAnomalyService>();

    const windowStart = new Date('2025-12-02T00:00:00.000Z');

    const windowEnd = new Date('2026-01-01T00:00:00.000Z');

    const computedAt = new Date('2026-01-01T00:15:00.000Z');

    let useCase: AnalyticDeviceProliferationSummaryUseCase;

    beforeEach(async () => {
        vi.resetAllMocks();

        const module: TestingModule = await Test.createTestingModule({
            providers: [
                AnalyticDeviceProliferationSummaryUseCase,
                {
                    provide: AnalyticAnomalyService,
                    useValue: analyticAnomalyService,
                },
            ],
        }).compile();

        useCase = module.get(AnalyticDeviceProliferationSummaryUseCase);
    });

    describe('execute', () => {
        it('wraps the domain result in the response envelope', async () => {
            const summary = {
                count: 6,
                windowStart,
                windowEnd,
                computedAt,
                metadata: { avg: 2.5, stdDev: 0.5, zScoreThreshold: 3 },
            };
            analyticAnomalyService.deviceProliferationSummary.mockResolvedValue(
                summary
            );

            const result = await useCase.execute();

            expect(result).toEqual({ data: summary });
            expect(
                analyticAnomalyService.deviceProliferationSummary
            ).toHaveBeenCalledWith();
        });
    });
});
