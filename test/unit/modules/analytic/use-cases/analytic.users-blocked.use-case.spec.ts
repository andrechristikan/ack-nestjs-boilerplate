import { Test } from '@nestjs/testing';
import type { TestingModule } from '@nestjs/testing';
import { mock } from 'vitest-mock-extended';
import type { MockProxy } from 'vitest-mock-extended';
import { AnalyticUserService } from '@modules/analytic/services/analytic.user.service';
import { AnalyticDateService } from '@modules/analytic/services/analytic.date.service';
import { AnalyticUsersBlockedUseCase } from '@modules/analytic/use-cases/analytic.users-blocked.use-case';

describe('AnalyticUsersBlockedUseCase', () => {
    const analyticUserService: MockProxy<AnalyticUserService> =
        mock<AnalyticUserService>();

    const analyticDateService: MockProxy<AnalyticDateService> =
        mock<AnalyticDateService>();

    const startDate: Date = new Date('2026-01-01T00:00:00.000Z');

    const endDate: Date = new Date('2026-02-01T00:00:00.000Z');

    let useCase: AnalyticUsersBlockedUseCase;

    beforeEach(async () => {
        const module: TestingModule = await Test.createTestingModule({
            providers: [
                AnalyticUsersBlockedUseCase,
                {
                    provide: AnalyticUserService,
                    useValue: analyticUserService,
                },
                { provide: AnalyticDateService, useValue: analyticDateService },
            ],
        }).compile();

        useCase = module.get(AnalyticUsersBlockedUseCase);
    });

    describe('execute', () => {
        it('wraps the domain result in the response envelope', async () => {
            analyticDateService.requireRange.mockReturnValue({
                startDate,
                endDate,
            });
            analyticUserService.usersBlocked.mockResolvedValue({
                trend: 3,
                current: 5,
            });

            const result = await useCase.execute({ startDate, endDate });

            expect(result).toEqual({ data: { trend: 3, current: 5 } });
            expect(analyticUserService.usersBlocked).toHaveBeenCalledWith(
                startDate,
                endDate
            );
        });
        it('passes the query dates to the range check', async () => {
            analyticDateService.requireRange.mockReturnValue({
                startDate,
                endDate,
            });
            analyticUserService.usersBlocked.mockResolvedValue({
                trend: 3,
                current: 5,
            });

            await useCase.execute({ startDate, endDate });

            expect(analyticDateService.requireRange).toHaveBeenCalledWith(
                startDate,
                endDate
            );
        });
    });
});
