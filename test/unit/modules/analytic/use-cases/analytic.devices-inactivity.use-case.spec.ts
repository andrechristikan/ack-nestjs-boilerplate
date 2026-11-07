import { Test } from '@nestjs/testing';
import type { TestingModule } from '@nestjs/testing';
import { mock } from 'vitest-mock-extended';
import type { MockProxy } from 'vitest-mock-extended';
import { AnalyticDashboardService } from '@modules/analytic/services/analytic.dashboard.service';
import { AnalyticDevicesInactivityUseCase } from '@modules/analytic/use-cases/analytic.devices-inactivity.use-case';

describe('AnalyticDevicesInactivityUseCase', () => {
    const analyticDashboardService: MockProxy<AnalyticDashboardService> =
        mock<AnalyticDashboardService>();

    let useCase: AnalyticDevicesInactivityUseCase;

    beforeEach(async () => {
        vi.resetAllMocks();

        const module: TestingModule = await Test.createTestingModule({
            providers: [
                AnalyticDevicesInactivityUseCase,
                {
                    provide: AnalyticDashboardService,
                    useValue: analyticDashboardService,
                },
            ],
        }).compile();

        useCase = module.get(AnalyticDevicesInactivityUseCase);
    });

    describe('execute', () => {
        it('wraps the domain result in the response envelope', async () => {
            analyticDashboardService.devicesInactivity.mockResolvedValue({
                count: 12,
            });

            const result = await useCase.execute();

            expect(result).toEqual({ data: { count: 12 } });
            expect(
                analyticDashboardService.devicesInactivity
            ).toHaveBeenCalledWith();
        });
    });
});
