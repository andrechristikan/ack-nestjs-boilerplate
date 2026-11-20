import { Test } from '@nestjs/testing';
import type { TestingModule } from '@nestjs/testing';
import { mock } from 'vitest-mock-extended';
import type { MockProxy } from 'vitest-mock-extended';
import { AnalyticWorkspaceService } from '@modules/analytic/services/analytic.workspace.service';
import { AnalyticDateService } from '@modules/analytic/services/analytic.date.service';
import { AnalyticWorkspacesCreationUseCase } from '@modules/analytic/use-cases/analytic.workspaces-creation.use-case';

describe('AnalyticWorkspacesCreationUseCase', () => {
    const analyticWorkspaceService: MockProxy<AnalyticWorkspaceService> =
        mock<AnalyticWorkspaceService>();

    const analyticDateService: MockProxy<AnalyticDateService> =
        mock<AnalyticDateService>();

    const startDate: Date = new Date('2026-01-01T00:00:00.000Z');

    const endDate: Date = new Date('2026-02-01T00:00:00.000Z');

    let useCase: AnalyticWorkspacesCreationUseCase;

    beforeEach(async () => {
        const module: TestingModule = await Test.createTestingModule({
            providers: [
                AnalyticWorkspacesCreationUseCase,
                {
                    provide: AnalyticWorkspaceService,
                    useValue: analyticWorkspaceService,
                },
                { provide: AnalyticDateService, useValue: analyticDateService },
            ],
        }).compile();

        useCase = module.get(AnalyticWorkspacesCreationUseCase);
    });

    describe('execute', () => {
        it('wraps the domain result in the response envelope', async () => {
            analyticDateService.requireRange.mockReturnValue({
                startDate,
                endDate,
            });
            analyticWorkspaceService.workspacesCreation.mockResolvedValue({
                count: 12,
            });

            const result = await useCase.execute({
                startDate,
                endDate,
            });

            expect(result).toEqual({ data: { count: 12 } });
            expect(
                analyticWorkspaceService.workspacesCreation
            ).toHaveBeenCalledWith(startDate, endDate);
        });
        it('passes the query dates to the range check', async () => {
            analyticDateService.requireRange.mockReturnValue({
                startDate,
                endDate,
            });
            analyticWorkspaceService.workspacesCreation.mockResolvedValue({
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
