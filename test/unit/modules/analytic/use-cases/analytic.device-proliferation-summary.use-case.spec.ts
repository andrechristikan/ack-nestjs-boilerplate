import { Test } from '@nestjs/testing';
import type { TestingModule } from '@nestjs/testing';
import { mock } from 'vitest-mock-extended';
import type { MockProxy } from 'vitest-mock-extended';
import { AnalyticAnomalyService } from '@modules/analytic/services/analytic.anomaly.service';
import { AnalyticDeviceProliferationSummaryUseCase } from '@modules/analytic/use-cases/analytic.device-proliferation-summary.use-case';

describe('AnalyticDeviceProliferationSummaryUseCase', () => {
    const analyticAnomalyService: MockProxy<AnalyticAnomalyService> =
        mock<AnalyticAnomalyService>();

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
            analyticAnomalyService.deviceProliferationSummary.mockResolvedValue(
                {
                    count: 4,
                    window: '1h',
                    meta: { avg: 2, stdDev: 0.5, zScoreThreshold: 3 },
                }
            );

            const result = await useCase.execute();

            expect(result).toEqual({
                data: {
                    count: 4,
                    window: '1h',
                    meta: { avg: 2, stdDev: 0.5, zScoreThreshold: 3 },
                },
            });
            expect(
                analyticAnomalyService.deviceProliferationSummary
            ).toHaveBeenCalledWith();
        });
    });
});
