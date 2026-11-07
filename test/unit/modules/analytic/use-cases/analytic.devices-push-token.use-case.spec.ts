import { Test } from '@nestjs/testing';
import type { TestingModule } from '@nestjs/testing';
import { mock } from 'vitest-mock-extended';
import type { MockProxy } from 'vitest-mock-extended';
import { AnalyticDashboardService } from '@modules/analytic/services/analytic.dashboard.service';
import { AnalyticDevicesPushTokenUseCase } from '@modules/analytic/use-cases/analytic.devices-push-token.use-case';

describe('AnalyticDevicesPushTokenUseCase', () => {
    const analyticDashboardService: MockProxy<AnalyticDashboardService> =
        mock<AnalyticDashboardService>();

    let useCase: AnalyticDevicesPushTokenUseCase;

    beforeEach(async () => {
        vi.resetAllMocks();

        const module: TestingModule = await Test.createTestingModule({
            providers: [
                AnalyticDevicesPushTokenUseCase,
                {
                    provide: AnalyticDashboardService,
                    useValue: analyticDashboardService,
                },
            ],
        }).compile();

        useCase = module.get(AnalyticDevicesPushTokenUseCase);
    });

    describe('execute', () => {
        it('wraps the domain result in the response envelope', async () => {
            analyticDashboardService.devicesPushToken.mockResolvedValue({
                count: 4,
                total: 10,
                rate: 0.4,
            });

            const result = await useCase.execute();

            expect(result).toEqual({
                data: { count: 4, total: 10, rate: 0.4 },
            });
            expect(
                analyticDashboardService.devicesPushToken
            ).toHaveBeenCalledWith();
        });
    });
});
