import { Test } from '@nestjs/testing';
import type { TestingModule } from '@nestjs/testing';
import { mock } from 'vitest-mock-extended';
import type { MockProxy } from 'vitest-mock-extended';
import { AnalyticDashboardService } from '@modules/analytic/services/analytic.dashboard.service';
import { AnalyticDevicesSessionRatioUseCase } from '@modules/analytic/use-cases/analytic.devices-session-ratio.use-case';

describe('AnalyticDevicesSessionRatioUseCase', () => {
    const analyticDashboardService: MockProxy<AnalyticDashboardService> =
        mock<AnalyticDashboardService>();

    let useCase: AnalyticDevicesSessionRatioUseCase;

    beforeEach(async () => {
        vi.resetAllMocks();

        const module: TestingModule = await Test.createTestingModule({
            providers: [
                AnalyticDevicesSessionRatioUseCase,
                {
                    provide: AnalyticDashboardService,
                    useValue: analyticDashboardService,
                },
            ],
        }).compile();

        useCase = module.get(AnalyticDevicesSessionRatioUseCase);
    });

    describe('execute', () => {
        it('wraps the domain result in the response envelope', async () => {
            analyticDashboardService.devicesSessionRatio.mockResolvedValue({
                sessions: 10,
                devices: 5,
                ratio: 2,
            });

            const result = await useCase.execute();

            expect(result).toEqual({
                data: { sessions: 10, devices: 5, ratio: 2 },
            });
            expect(
                analyticDashboardService.devicesSessionRatio
            ).toHaveBeenCalledWith();
        });
    });
});
