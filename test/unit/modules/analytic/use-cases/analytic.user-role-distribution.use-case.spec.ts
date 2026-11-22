import { Test } from '@nestjs/testing';
import type { TestingModule } from '@nestjs/testing';
import { mock } from 'vitest-mock-extended';
import type { MockProxy } from 'vitest-mock-extended';
import { AnalyticUserService } from '@modules/analytic/services/analytic.user.service';
import { AnalyticUserRoleDistributionUseCase } from '@modules/analytic/use-cases/analytic.user-role-distribution.use-case';

describe('AnalyticUserRoleDistributionUseCase', () => {
    const analyticUserService: MockProxy<AnalyticUserService> =
        mock<AnalyticUserService>();

    let useCase: AnalyticUserRoleDistributionUseCase;

    beforeEach(async () => {
        const module: TestingModule = await Test.createTestingModule({
            providers: [
                AnalyticUserRoleDistributionUseCase,
                {
                    provide: AnalyticUserService,
                    useValue: analyticUserService,
                },
            ],
        }).compile();

        useCase = module.get(AnalyticUserRoleDistributionUseCase);
    });

    describe('execute', () => {
        it('wraps the domain result in the response envelope', async () => {
            analyticUserService.getUserRoleDistribution.mockResolvedValue({
                buckets: [{ key: 'key-1', count: 7 }],
            });

            const result = await useCase.execute();

            expect(result).toEqual({
                data: { buckets: [{ key: 'key-1', count: 7 }] },
            });
            expect(
                analyticUserService.getUserRoleDistribution
            ).toHaveBeenCalledWith();
        });
    });
});
