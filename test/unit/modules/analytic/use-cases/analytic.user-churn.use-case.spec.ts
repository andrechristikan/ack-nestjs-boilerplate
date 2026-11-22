import { Test } from '@nestjs/testing';
import type { TestingModule } from '@nestjs/testing';
import { mock } from 'vitest-mock-extended';
import type { MockProxy } from 'vitest-mock-extended';
import { AnalyticUserService } from '@modules/analytic/services/analytic.user.service';
import { AnalyticDateService } from '@modules/analytic/services/analytic.date.service';
import { AnalyticUserChurnUseCase } from '@modules/analytic/use-cases/analytic.user-churn.use-case';

describe('AnalyticUserChurnUseCase', () => {
    const analyticUserService: MockProxy<AnalyticUserService> =
        mock<AnalyticUserService>();

    const analyticDateService: MockProxy<AnalyticDateService> =
        mock<AnalyticDateService>();

    const startDate: Date = new Date('2026-01-01T00:00:00.000Z');

    const endDate: Date = new Date('2026-02-01T00:00:00.000Z');

    let useCase: AnalyticUserChurnUseCase;

    beforeEach(async () => {
        const module: TestingModule = await Test.createTestingModule({
            providers: [
                AnalyticUserChurnUseCase,
                {
                    provide: AnalyticUserService,
                    useValue: analyticUserService,
                },
                { provide: AnalyticDateService, useValue: analyticDateService },
            ],
        }).compile();

        useCase = module.get(AnalyticUserChurnUseCase);
    });

    describe('execute', () => {
        it('wraps the domain result in the response envelope', async () => {
            analyticDateService.requireRange.mockReturnValue({
                startDate,
                endDate,
            });
            analyticUserService.getUserChurn.mockResolvedValue({
                count: 4,
                total: 10,
                rate: 0.4,
            });

            const result = await useCase.execute({ startDate, endDate });

            expect(result).toEqual({
                data: { count: 4, total: 10, rate: 0.4 },
            });
            expect(analyticUserService.getUserChurn).toHaveBeenCalledWith(
                startDate,
                endDate
            );
        });
        it('passes the query dates to the range check', async () => {
            analyticDateService.requireRange.mockReturnValue({
                startDate,
                endDate,
            });
            analyticUserService.getUserChurn.mockResolvedValue({
                count: 4,
                total: 10,
                rate: 0.4,
            });

            await useCase.execute({ startDate, endDate });

            expect(analyticDateService.requireRange).toHaveBeenCalledWith(
                startDate,
                endDate
            );
        });
    });
});
