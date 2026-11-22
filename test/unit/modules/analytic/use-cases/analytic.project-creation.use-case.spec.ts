import { Test } from '@nestjs/testing';
import type { TestingModule } from '@nestjs/testing';
import { mock } from 'vitest-mock-extended';
import type { MockProxy } from 'vitest-mock-extended';
import { AnalyticProjectService } from '@modules/analytic/services/analytic.project.service';
import { AnalyticDateService } from '@modules/analytic/services/analytic.date.service';
import { AnalyticProjectCreationUseCase } from '@modules/analytic/use-cases/analytic.project-creation.use-case';

describe('AnalyticProjectCreationUseCase', () => {
    const analyticProjectService: MockProxy<AnalyticProjectService> =
        mock<AnalyticProjectService>();

    const analyticDateService: MockProxy<AnalyticDateService> =
        mock<AnalyticDateService>();

    const startDate: Date = new Date('2026-01-01T00:00:00.000Z');

    const endDate: Date = new Date('2026-02-01T00:00:00.000Z');

    let useCase: AnalyticProjectCreationUseCase;

    beforeEach(async () => {
        const module: TestingModule = await Test.createTestingModule({
            providers: [
                AnalyticProjectCreationUseCase,
                {
                    provide: AnalyticProjectService,
                    useValue: analyticProjectService,
                },
                { provide: AnalyticDateService, useValue: analyticDateService },
            ],
        }).compile();

        useCase = module.get(AnalyticProjectCreationUseCase);
    });

    describe('execute', () => {
        it('wraps the domain result in the response envelope', async () => {
            analyticDateService.requireRange.mockReturnValue({
                startDate,
                endDate,
            });
            analyticProjectService.getProjectCreation.mockResolvedValue({
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
                analyticProjectService.getProjectCreation
            ).toHaveBeenCalledWith(startDate, endDate);
        });
        it('passes the query dates to the range check', async () => {
            analyticDateService.requireRange.mockReturnValue({
                startDate,
                endDate,
            });
            analyticProjectService.getProjectCreation.mockResolvedValue({
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
