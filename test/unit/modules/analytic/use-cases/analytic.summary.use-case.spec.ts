import { Test } from '@nestjs/testing';
import type { TestingModule } from '@nestjs/testing';
import { mock } from 'vitest-mock-extended';
import type { MockProxy } from 'vitest-mock-extended';
import { AnalyticWorkspaceUserService } from '@modules/analytic/services/analytic.workspace-user.service';
import { AnalyticDateService } from '@modules/analytic/services/analytic.date.service';
import { AnalyticSummaryUseCase } from '@modules/analytic/use-cases/analytic.summary.use-case';

describe('AnalyticSummaryUseCase', () => {
    const analyticWorkspaceUserService: MockProxy<AnalyticWorkspaceUserService> =
        mock<AnalyticWorkspaceUserService>();

    const analyticDateService: MockProxy<AnalyticDateService> =
        mock<AnalyticDateService>();

    const startDate: Date = new Date('2026-01-01T00:00:00.000Z');

    const endDate: Date = new Date('2026-02-01T00:00:00.000Z');

    let useCase: AnalyticSummaryUseCase;

    beforeEach(async () => {
        vi.resetAllMocks();

        const module: TestingModule = await Test.createTestingModule({
            providers: [
                AnalyticSummaryUseCase,
                {
                    provide: AnalyticWorkspaceUserService,
                    useValue: analyticWorkspaceUserService,
                },
                { provide: AnalyticDateService, useValue: analyticDateService },
            ],
        }).compile();

        useCase = module.get(AnalyticSummaryUseCase);
    });

    describe('execute', () => {
        it('wraps the domain result in the response envelope', async () => {
            analyticDateService.optionalRange.mockReturnValue({
                startDate,
                endDate,
            });
            analyticWorkspaceUserService.summary.mockResolvedValue({
                memberCount: 3,
                projectCount: 2,
                activityCount: 9,
            });

            const result = await useCase.execute('workspace-1', {
                startDate,
                endDate,
            });

            expect(analyticDateService.optionalRange).toHaveBeenCalledWith(
                startDate,
                endDate
            );
            expect(result).toEqual({
                data: { memberCount: 3, projectCount: 2, activityCount: 9 },
            });
            expect(analyticWorkspaceUserService.summary).toHaveBeenCalledWith(
                'workspace-1',
                startDate,
                endDate
            );
        });

        it('passes null dates when the optional range is empty', async () => {
            analyticDateService.optionalRange.mockReturnValue({
                startDate: null,
                endDate: null,
            });
            analyticWorkspaceUserService.summary.mockResolvedValue({
                memberCount: 0,
                projectCount: 0,
                activityCount: 0,
            });

            await useCase.execute('workspace-1', {});

            expect(analyticDateService.optionalRange).toHaveBeenCalledWith(
                null,
                null
            );
            expect(analyticWorkspaceUserService.summary).toHaveBeenCalledWith(
                'workspace-1',
                null,
                null
            );
        });
    });
});
