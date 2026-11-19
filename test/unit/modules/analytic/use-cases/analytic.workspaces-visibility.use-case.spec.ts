import { Test } from '@nestjs/testing';
import type { TestingModule } from '@nestjs/testing';
import { mock } from 'vitest-mock-extended';
import type { MockProxy } from 'vitest-mock-extended';
import { AnalyticWorkspaceService } from '@modules/analytic/services/analytic.workspace.service';
import { AnalyticWorkspacesVisibilityUseCase } from '@modules/analytic/use-cases/analytic.workspaces-visibility.use-case';

describe('AnalyticWorkspacesVisibilityUseCase', () => {
    const analyticWorkspaceService: MockProxy<AnalyticWorkspaceService> =
        mock<AnalyticWorkspaceService>();

    let useCase: AnalyticWorkspacesVisibilityUseCase;

    beforeEach(async () => {
        vi.resetAllMocks();

        const module: TestingModule = await Test.createTestingModule({
            providers: [
                AnalyticWorkspacesVisibilityUseCase,
                {
                    provide: AnalyticWorkspaceService,
                    useValue: analyticWorkspaceService,
                },
            ],
        }).compile();

        useCase = module.get(AnalyticWorkspacesVisibilityUseCase);
    });

    describe('execute', () => {
        it('wraps the domain result in the response envelope', async () => {
            analyticWorkspaceService.workspacesVisibility.mockResolvedValue({
                buckets: [{ key: 'key-1', count: 7 }],
            });

            const result = await useCase.execute();

            expect(result).toEqual({
                data: { buckets: [{ key: 'key-1', count: 7 }] },
            });
            expect(
                analyticWorkspaceService.workspacesVisibility
            ).toHaveBeenCalledWith();
        });
    });
});
