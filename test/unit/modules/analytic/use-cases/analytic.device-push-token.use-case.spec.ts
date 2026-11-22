import { Test } from '@nestjs/testing';
import type { TestingModule } from '@nestjs/testing';
import { mock } from 'vitest-mock-extended';
import type { MockProxy } from 'vitest-mock-extended';
import { AnalyticDeviceService } from '@modules/analytic/services/analytic.device.service';
import { AnalyticDevicePushTokenUseCase } from '@modules/analytic/use-cases/analytic.device-push-token.use-case';

describe('AnalyticDevicePushTokenUseCase', () => {
    const analyticDeviceService: MockProxy<AnalyticDeviceService> =
        mock<AnalyticDeviceService>();

    let useCase: AnalyticDevicePushTokenUseCase;

    beforeEach(async () => {
        const module: TestingModule = await Test.createTestingModule({
            providers: [
                AnalyticDevicePushTokenUseCase,
                {
                    provide: AnalyticDeviceService,
                    useValue: analyticDeviceService,
                },
            ],
        }).compile();

        useCase = module.get(AnalyticDevicePushTokenUseCase);
    });

    describe('execute', () => {
        it('wraps the domain result in the response envelope', async () => {
            analyticDeviceService.getDevicePushToken.mockResolvedValue({
                count: 4,
                total: 10,
                rate: 0.4,
            });

            const result = await useCase.execute();

            expect(result).toEqual({
                data: { count: 4, total: 10, rate: 0.4 },
            });
            expect(
                analyticDeviceService.getDevicePushToken
            ).toHaveBeenCalledWith();
        });
    });
});
