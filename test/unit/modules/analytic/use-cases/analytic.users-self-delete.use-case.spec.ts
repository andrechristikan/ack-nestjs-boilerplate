import { Test } from '@nestjs/testing';
import type { TestingModule } from '@nestjs/testing';
import { mock } from 'vitest-mock-extended';
import type { MockProxy } from 'vitest-mock-extended';
import { AnalyticUserService } from '@modules/analytic/services/analytic.user.service';
import { AnalyticDateService } from '@modules/analytic/services/analytic.date.service';
import { AnalyticUsersSelfDeleteUseCase } from '@modules/analytic/use-cases/analytic.users-self-delete.use-case';

describe('AnalyticUsersSelfDeleteUseCase', () => {
    const analyticUserService: MockProxy<AnalyticUserService> =
        mock<AnalyticUserService>();

    const analyticDateService: MockProxy<AnalyticDateService> =
        mock<AnalyticDateService>();

    const startDate: Date = new Date('2026-01-01T00:00:00.000Z');

    const endDate: Date = new Date('2026-02-01T00:00:00.000Z');

    let useCase: AnalyticUsersSelfDeleteUseCase;

    beforeEach(async () => {
        vi.resetAllMocks();

        const module: TestingModule = await Test.createTestingModule({
            providers: [
                AnalyticUsersSelfDeleteUseCase,
                {
                    provide: AnalyticUserService,
                    useValue: analyticUserService,
                },
                { provide: AnalyticDateService, useValue: analyticDateService },
            ],
        }).compile();

        useCase = module.get(AnalyticUsersSelfDeleteUseCase);
    });

    describe('execute', () => {
        it('wraps the domain result in the response envelope', async () => {
            analyticDateService.requireRange.mockReturnValue({
                startDate,
                endDate,
            });
            analyticUserService.usersSelfDelete.mockResolvedValue({
                count: 12,
            });

            const result = await useCase.execute({
                startDate,
                endDate,
            });

            expect(result).toEqual({ data: { count: 12 } });
            expect(analyticUserService.usersSelfDelete).toHaveBeenCalledWith(
                startDate,
                endDate
            );
        });
        it('passes the query dates to the range check', async () => {
            analyticDateService.requireRange.mockReturnValue({
                startDate,
                endDate,
            });
            analyticUserService.usersSelfDelete.mockResolvedValue({
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
