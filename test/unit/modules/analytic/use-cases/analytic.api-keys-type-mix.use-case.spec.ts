import { Test } from '@nestjs/testing';
import type { TestingModule } from '@nestjs/testing';
import { mock } from 'vitest-mock-extended';
import type { MockProxy } from 'vitest-mock-extended';
import { AnalyticDashboardService } from '@modules/analytic/services/analytic.dashboard.service';
import { AnalyticApiKeysTypeMixUseCase } from '@modules/analytic/use-cases/analytic.api-keys-type-mix.use-case';

describe('AnalyticApiKeysTypeMixUseCase', () => {
    const analyticDashboardService: MockProxy<AnalyticDashboardService> =
        mock<AnalyticDashboardService>();

    let useCase: AnalyticApiKeysTypeMixUseCase;

    beforeEach(async () => {
        vi.resetAllMocks();

        const module: TestingModule = await Test.createTestingModule({
            providers: [
                AnalyticApiKeysTypeMixUseCase,
                {
                    provide: AnalyticDashboardService,
                    useValue: analyticDashboardService,
                },
            ],
        }).compile();

        useCase = module.get(AnalyticApiKeysTypeMixUseCase);
    });

    describe('execute', () => {
        it('wraps the domain result in the response envelope', async () => {
            analyticDashboardService.apiKeysTypeMix.mockResolvedValue({
                buckets: [{ key: 'key-1', count: 7 }],
            });

            const result = await useCase.execute();

            expect(result).toEqual({
                data: { buckets: [{ key: 'key-1', count: 7 }] },
            });
            expect(
                analyticDashboardService.apiKeysTypeMix
            ).toHaveBeenCalledWith();
        });
    });
});
