import { Test } from '@nestjs/testing';
import type { TestingModule } from '@nestjs/testing';
import { mock } from 'vitest-mock-extended';
import type { MockProxy } from 'vitest-mock-extended';
import { AnalyticAuthService } from '@modules/analytic/services/analytic.auth.service';
import { AnalyticDateService } from '@modules/analytic/services/analytic.date.service';
import { AnalyticAuthLockoutUseCase } from '@modules/analytic/use-cases/analytic.auth-lockout.use-case';

describe('AnalyticAuthLockoutUseCase', () => {
    const analyticAuthService: MockProxy<AnalyticAuthService> =
        mock<AnalyticAuthService>();

    const analyticDateService: MockProxy<AnalyticDateService> =
        mock<AnalyticDateService>();

    const startDate: Date = new Date('2026-01-01T00:00:00.000Z');

    const endDate: Date = new Date('2026-02-01T00:00:00.000Z');

    let useCase: AnalyticAuthLockoutUseCase;

    beforeEach(async () => {
        vi.resetAllMocks();

        const module: TestingModule = await Test.createTestingModule({
            providers: [
                AnalyticAuthLockoutUseCase,
                {
                    provide: AnalyticAuthService,
                    useValue: analyticAuthService,
                },
                { provide: AnalyticDateService, useValue: analyticDateService },
            ],
        }).compile();

        useCase = module.get(AnalyticAuthLockoutUseCase);
    });

    describe('execute', () => {
        it('wraps the domain result in the response envelope', async () => {
            analyticDateService.requireRange.mockReturnValue({
                startDate,
                endDate,
            });
            analyticAuthService.authLockout.mockResolvedValue({
                failed: 6,
                maxAttempt: 3,
            });

            const result = await useCase.execute({ startDate, endDate });

            expect(result).toEqual({ data: { failed: 6, maxAttempt: 3 } });
            expect(analyticAuthService.authLockout).toHaveBeenCalledWith(
                startDate,
                endDate
            );
        });
        it('passes the query dates to the range check', async () => {
            analyticDateService.requireRange.mockReturnValue({
                startDate,
                endDate,
            });
            analyticAuthService.authLockout.mockResolvedValue({
                failed: 6,
                maxAttempt: 3,
            });

            await useCase.execute({ startDate, endDate });

            expect(analyticDateService.requireRange).toHaveBeenCalledWith(
                startDate,
                endDate
            );
        });
    });
});
