import { Test } from '@nestjs/testing';
import type { TestingModule } from '@nestjs/testing';
import { mock } from 'vitest-mock-extended';
import type { MockProxy } from 'vitest-mock-extended';
import { AnalyticDashboardService } from '@modules/analytic/services/analytic.dashboard.service';
import { AnalyticAuthPasswordExpiryUseCase } from '@modules/analytic/use-cases/analytic.auth-password-expiry.use-case';

describe('AnalyticAuthPasswordExpiryUseCase', () => {
    const analyticDashboardService: MockProxy<AnalyticDashboardService> =
        mock<AnalyticDashboardService>();

    let useCase: AnalyticAuthPasswordExpiryUseCase;

    beforeEach(async () => {
        vi.resetAllMocks();

        const module: TestingModule = await Test.createTestingModule({
            providers: [
                AnalyticAuthPasswordExpiryUseCase,
                {
                    provide: AnalyticDashboardService,
                    useValue: analyticDashboardService,
                },
            ],
        }).compile();

        useCase = module.get(AnalyticAuthPasswordExpiryUseCase);
    });

    describe('execute', () => {
        it('wraps the domain result in the response envelope', async () => {
            analyticDashboardService.authPasswordExpiry.mockResolvedValue({
                expired: 2,
                total: 10,
                compliant: 8,
                rate: 0.8,
            });

            const result = await useCase.execute();

            expect(result).toEqual({
                data: { expired: 2, total: 10, compliant: 8, rate: 0.8 },
            });
            expect(
                analyticDashboardService.authPasswordExpiry
            ).toHaveBeenCalledWith();
        });
    });
});
