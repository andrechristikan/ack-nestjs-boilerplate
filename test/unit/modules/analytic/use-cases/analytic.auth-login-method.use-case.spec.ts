import { Test } from '@nestjs/testing';
import type { TestingModule } from '@nestjs/testing';
import { mock } from 'vitest-mock-extended';
import type { MockProxy } from 'vitest-mock-extended';
import { AnalyticDashboardService } from '@modules/analytic/services/analytic.dashboard.service';
import { AnalyticDateService } from '@modules/analytic/services/analytic.date.service';
import { AnalyticAuthLoginMethodUseCase } from '@modules/analytic/use-cases/analytic.auth-login-method.use-case';

describe('AnalyticAuthLoginMethodUseCase', () => {
    const analyticDashboardService: MockProxy<AnalyticDashboardService> =
        mock<AnalyticDashboardService>();

    const analyticDateService: MockProxy<AnalyticDateService> =
        mock<AnalyticDateService>();

    const startDate: Date = new Date('2026-01-01T00:00:00.000Z');

    const endDate: Date = new Date('2026-02-01T00:00:00.000Z');

    let useCase: AnalyticAuthLoginMethodUseCase;

    beforeEach(async () => {
        vi.resetAllMocks();

        const module: TestingModule = await Test.createTestingModule({
            providers: [
                AnalyticAuthLoginMethodUseCase,
                {
                    provide: AnalyticDashboardService,
                    useValue: analyticDashboardService,
                },
                { provide: AnalyticDateService, useValue: analyticDateService },
            ],
        }).compile();

        useCase = module.get(AnalyticAuthLoginMethodUseCase);
    });

    describe('execute', () => {
        it('wraps the domain result in the response envelope', async () => {
            analyticDateService.optionalRange.mockReturnValue({
                startDate,
                endDate,
            });
            analyticDashboardService.authLoginMethod.mockResolvedValue({
                buckets: [{ key: 'key-1', count: 7 }],
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
                data: { buckets: [{ key: 'key-1', count: 7 }] },
            });
            expect(
                analyticDashboardService.authLoginMethod
            ).toHaveBeenCalledWith(startDate, endDate);
        });
        it('passes null dates when the optional range is empty', async () => {
            analyticDateService.optionalRange.mockReturnValue({
                startDate: null,
                endDate: null,
            });
            analyticDashboardService.authLoginMethod.mockResolvedValue({
                buckets: [{ key: 'key-1', count: 7 }],
            });

            await useCase.execute({});

            expect(analyticDateService.optionalRange).toHaveBeenCalledWith(
                null,
                null
            );

            expect(
                analyticDashboardService.authLoginMethod
            ).toHaveBeenCalledWith(null, null);
        });
    });
});
