import { Test } from '@nestjs/testing';
import type { TestingModule } from '@nestjs/testing';
import { mock } from 'vitest-mock-extended';
import type { MockProxy } from 'vitest-mock-extended';
import { AnalyticUserService } from '@modules/analytic/services/analytic.user.service';
import { AnalyticDateService } from '@modules/analytic/services/analytic.date.service';
import { AnalyticUsersMobileChurnUseCase } from '@modules/analytic/use-cases/analytic.users-mobile-churn.use-case';

describe('AnalyticUsersMobileChurnUseCase', () => {
    const analyticUserService: MockProxy<AnalyticUserService> =
        mock<AnalyticUserService>();

    const analyticDateService: MockProxy<AnalyticDateService> =
        mock<AnalyticDateService>();

    const startDate: Date = new Date('2026-01-01T00:00:00.000Z');

    const endDate: Date = new Date('2026-02-01T00:00:00.000Z');

    let useCase: AnalyticUsersMobileChurnUseCase;

    beforeEach(async () => {
        vi.resetAllMocks();

        const module: TestingModule = await Test.createTestingModule({
            providers: [
                AnalyticUsersMobileChurnUseCase,
                {
                    provide: AnalyticUserService,
                    useValue: analyticUserService,
                },
                { provide: AnalyticDateService, useValue: analyticDateService },
            ],
        }).compile();

        useCase = module.get(AnalyticUsersMobileChurnUseCase);
    });

    describe('execute', () => {
        it('wraps the domain result in the response envelope', async () => {
            analyticDateService.requireRange.mockReturnValue({
                startDate,
                endDate,
            });
            analyticUserService.usersMobileChurn.mockResolvedValue({
                added: 1,
                updated: 2,
                deleted: 3,
            });

            const result = await useCase.execute({
                startDate,
                endDate,
            });

            expect(result).toEqual({
                data: { added: 1, updated: 2, deleted: 3 },
            });
            expect(analyticUserService.usersMobileChurn).toHaveBeenCalledWith(
                startDate,
                endDate
            );
        });
        it('passes the query dates to the range check', async () => {
            analyticDateService.requireRange.mockReturnValue({
                startDate,
                endDate,
            });
            analyticUserService.usersMobileChurn.mockResolvedValue({
                added: 1,
                updated: 2,
                deleted: 3,
            });

            await useCase.execute({ startDate, endDate });

            expect(analyticDateService.requireRange).toHaveBeenCalledWith(
                startDate,
                endDate
            );
        });
    });
});
