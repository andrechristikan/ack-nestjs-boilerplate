import { Test } from '@nestjs/testing';
import type { TestingModule } from '@nestjs/testing';
import { mock } from 'vitest-mock-extended';
import type { MockProxy } from 'vitest-mock-extended';
import { AnalyticDeviceService } from '@modules/analytic/services/analytic.device.service';
import { AnalyticDevicesSessionRatioUseCase } from '@modules/analytic/use-cases/analytic.devices-session-ratio.use-case';

describe('AnalyticDevicesSessionRatioUseCase', () => {
    const analyticDeviceService: MockProxy<AnalyticDeviceService> =
        mock<AnalyticDeviceService>();

    let useCase: AnalyticDevicesSessionRatioUseCase;

    beforeEach(async () => {
        vi.resetAllMocks();

        const module: TestingModule = await Test.createTestingModule({
            providers: [
                AnalyticDevicesSessionRatioUseCase,
                {
                    provide: AnalyticDeviceService,
                    useValue: analyticDeviceService,
                },
            ],
        }).compile();

        useCase = module.get(AnalyticDevicesSessionRatioUseCase);
    });

    describe('execute', () => {
        it('wraps the domain result in the response envelope', async () => {
            analyticDeviceService.devicesSessionRatio.mockResolvedValue({
                sessions: 10,
                devices: 5,
                ratio: 2,
            });

            const result = await useCase.execute();

            expect(result).toEqual({
                data: { sessions: 10, devices: 5, ratio: 2 },
            });
            expect(
                analyticDeviceService.devicesSessionRatio
            ).toHaveBeenCalledWith();
        });
    });
});
