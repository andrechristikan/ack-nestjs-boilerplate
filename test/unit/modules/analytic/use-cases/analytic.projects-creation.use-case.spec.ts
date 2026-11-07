import { Test } from '@nestjs/testing';
import type { TestingModule } from '@nestjs/testing';
import { mock } from 'vitest-mock-extended';
import type { MockProxy } from 'vitest-mock-extended';
import { AnalyticDashboardService } from '@modules/analytic/services/analytic.dashboard.service';
import { AnalyticDateService } from '@modules/analytic/services/analytic.date.service';
import { AnalyticProjectsCreationUseCase } from '@modules/analytic/use-cases/analytic.projects-creation.use-case';

describe('AnalyticProjectsCreationUseCase', () => {
    const analyticDashboardService: MockProxy<AnalyticDashboardService> =
        mock<AnalyticDashboardService>();

    const analyticDateService: MockProxy<AnalyticDateService> =
        mock<AnalyticDateService>();

    const startDate: Date = new Date('2026-01-01T00:00:00.000Z');

    const endDate: Date = new Date('2026-02-01T00:00:00.000Z');

    let useCase: AnalyticProjectsCreationUseCase;

    beforeEach(async () => {
        vi.resetAllMocks();

        const module: TestingModule = await Test.createTestingModule({
            providers: [
                AnalyticProjectsCreationUseCase,
                {
                    provide: AnalyticDashboardService,
                    useValue: analyticDashboardService,
                },
                { provide: AnalyticDateService, useValue: analyticDateService },
            ],
        }).compile();

        useCase = module.get(AnalyticProjectsCreationUseCase);
    });

    describe('execute', () => {
        it('wraps the domain result in the response envelope', async () => {
            analyticDateService.requireRange.mockReturnValue({
                startDate,
                endDate,
            });
            analyticDashboardService.projectsCreation.mockResolvedValue({
                created: 2,
                perWorkspace: [{ workspaceId: 'workspace-1', count: 2 }],
            });

            const result = await useCase.execute({
                startDate,
                endDate,
            });

            expect(result).toEqual({
                data: {
                    created: 2,
                    perWorkspace: [{ workspaceId: 'workspace-1', count: 2 }],
                },
            });
            expect(
                analyticDashboardService.projectsCreation
            ).toHaveBeenCalledWith(startDate, endDate);
        });
        it('passes the query dates to the range check', async () => {
            analyticDateService.requireRange.mockReturnValue({
                startDate,
                endDate,
            });
            analyticDashboardService.projectsCreation.mockResolvedValue({
                created: 2,
                perWorkspace: [{ workspaceId: 'workspace-1', count: 2 }],
            });

            await useCase.execute({ startDate, endDate });

            expect(analyticDateService.requireRange).toHaveBeenCalledWith(
                startDate,
                endDate
            );
        });
    });
});
