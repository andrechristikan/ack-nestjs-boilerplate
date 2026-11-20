import { Test } from '@nestjs/testing';
import type { TestingModule } from '@nestjs/testing';
import { mock } from 'vitest-mock-extended';
import type { MockProxy } from 'vitest-mock-extended';
import { AnalyticDeviceService } from '@modules/analytic/services/analytic.device.service';
import { AnalyticDevicesInactivityUseCase } from '@modules/analytic/use-cases/analytic.devices-inactivity.use-case';

describe('AnalyticDevicesInactivityUseCase', () => {
    const analyticDeviceService: MockProxy<AnalyticDeviceService> =
        mock<AnalyticDeviceService>();

    let useCase: AnalyticDevicesInactivityUseCase;

    beforeEach(async () => {
        const module: TestingModule = await Test.createTestingModule({
            providers: [
                AnalyticDevicesInactivityUseCase,
                {
                    provide: AnalyticDeviceService,
                    useValue: analyticDeviceService,
                },
            ],
        }).compile();

        useCase = module.get(AnalyticDevicesInactivityUseCase);
    });

    describe('execute', () => {
        it('wraps the domain result in the response envelope', async () => {
            analyticDeviceService.devicesInactivity.mockResolvedValue({
                count: 12,
            });

            const result = await useCase.execute();

            expect(result).toEqual({ data: { count: 12 } });
            expect(
                analyticDeviceService.devicesInactivity
            ).toHaveBeenCalledWith();
        });
    });
});
