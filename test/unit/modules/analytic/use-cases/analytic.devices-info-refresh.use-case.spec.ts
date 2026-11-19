import { Test } from '@nestjs/testing';
import type { TestingModule } from '@nestjs/testing';
import { mock } from 'vitest-mock-extended';
import type { MockProxy } from 'vitest-mock-extended';
import { AnalyticDeviceService } from '@modules/analytic/services/analytic.device.service';
import { AnalyticDateService } from '@modules/analytic/services/analytic.date.service';
import { AnalyticDevicesInfoRefreshUseCase } from '@modules/analytic/use-cases/analytic.devices-info-refresh.use-case';

describe('AnalyticDevicesInfoRefreshUseCase', () => {
    const analyticDeviceService: MockProxy<AnalyticDeviceService> =
        mock<AnalyticDeviceService>();

    const analyticDateService: MockProxy<AnalyticDateService> =
        mock<AnalyticDateService>();

    const startDate: Date = new Date('2026-01-01T00:00:00.000Z');

    const endDate: Date = new Date('2026-02-01T00:00:00.000Z');

    let useCase: AnalyticDevicesInfoRefreshUseCase;

    beforeEach(async () => {
        vi.resetAllMocks();

        const module: TestingModule = await Test.createTestingModule({
            providers: [
                AnalyticDevicesInfoRefreshUseCase,
                {
                    provide: AnalyticDeviceService,
                    useValue: analyticDeviceService,
                },
                { provide: AnalyticDateService, useValue: analyticDateService },
            ],
        }).compile();

        useCase = module.get(AnalyticDevicesInfoRefreshUseCase);
    });

    describe('execute', () => {
        it('wraps the domain result in the response envelope', async () => {
            analyticDateService.requireRange.mockReturnValue({
                startDate,
                endDate,
            });
            analyticDeviceService.devicesInfoRefresh.mockResolvedValue({
                count: 12,
            });

            const result = await useCase.execute({
                startDate,
                endDate,
            });

            expect(result).toEqual({ data: { count: 12 } });
            expect(
                analyticDeviceService.devicesInfoRefresh
            ).toHaveBeenCalledWith(startDate, endDate);
        });
        it('passes the query dates to the range check', async () => {
            analyticDateService.requireRange.mockReturnValue({
                startDate,
                endDate,
            });
            analyticDeviceService.devicesInfoRefresh.mockResolvedValue({
                count: 12,
            });

            await useCase.execute({ startDate, endDate });

            expect(analyticDateService.requireRange).toHaveBeenCalledWith(
                startDate,
                endDate
            );
        });
    });
});
