import { Test } from '@nestjs/testing';
import type { TestingModule } from '@nestjs/testing';
import { mock } from 'vitest-mock-extended';
import type { MockProxy } from 'vitest-mock-extended';
import { AnalyticWorkspaceUserService } from '@modules/analytic/services/analytic.workspace-user.service';
import { AnalyticDateService } from '@modules/analytic/services/analytic.date.service';
import { AnalyticJoinOutcomesUseCase } from '@modules/analytic/use-cases/analytic.join-outcomes.use-case';

describe('AnalyticJoinOutcomesUseCase', () => {
    const analyticWorkspaceUserService: MockProxy<AnalyticWorkspaceUserService> =
        mock<AnalyticWorkspaceUserService>();

    const analyticDateService: MockProxy<AnalyticDateService> =
        mock<AnalyticDateService>();

    const startDate: Date = new Date('2026-01-01T00:00:00.000Z');

    const endDate: Date = new Date('2026-02-01T00:00:00.000Z');

    let useCase: AnalyticJoinOutcomesUseCase;

    beforeEach(async () => {
        vi.resetAllMocks();

        const module: TestingModule = await Test.createTestingModule({
            providers: [
                AnalyticJoinOutcomesUseCase,
                {
                    provide: AnalyticWorkspaceUserService,
                    useValue: analyticWorkspaceUserService,
                },
                { provide: AnalyticDateService, useValue: analyticDateService },
            ],
        }).compile();

        useCase = module.get(AnalyticJoinOutcomesUseCase);
    });

    describe('execute', () => {
        it('wraps the domain result in the response envelope', async () => {
            analyticDateService.requireRange.mockReturnValue({
                startDate,
                endDate,
            });
            analyticWorkspaceUserService.joinOutcomes.mockResolvedValue([
                { status: 'pending', count: 2 },
            ]);

            const result = await useCase.execute('workspace-1', {
                startDate,
                endDate,
            });

            expect(result).toEqual({
                data: { statuses: [{ status: 'pending', count: 2 }] },
            });
            expect(
                analyticWorkspaceUserService.joinOutcomes
            ).toHaveBeenCalledWith('workspace-1', startDate, endDate);
        });

        it('passes the query dates to the range check', async () => {
            analyticDateService.requireRange.mockReturnValue({
                startDate,
                endDate,
            });
            analyticWorkspaceUserService.joinOutcomes.mockResolvedValue([]);

            await useCase.execute('workspace-1', { startDate, endDate });

            expect(analyticDateService.requireRange).toHaveBeenCalledWith(
                startDate,
                endDate
            );
        });
    });
});
