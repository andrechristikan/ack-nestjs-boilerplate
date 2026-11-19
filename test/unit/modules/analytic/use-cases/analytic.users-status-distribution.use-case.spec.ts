import { Test } from '@nestjs/testing';
import type { TestingModule } from '@nestjs/testing';
import { mock } from 'vitest-mock-extended';
import type { MockProxy } from 'vitest-mock-extended';
import { AnalyticUserService } from '@modules/analytic/services/analytic.user.service';
import { AnalyticUsersStatusDistributionUseCase } from '@modules/analytic/use-cases/analytic.users-status-distribution.use-case';

describe('AnalyticUsersStatusDistributionUseCase', () => {
    const analyticUserService: MockProxy<AnalyticUserService> =
        mock<AnalyticUserService>();

    let useCase: AnalyticUsersStatusDistributionUseCase;

    beforeEach(async () => {
        vi.resetAllMocks();

        const module: TestingModule = await Test.createTestingModule({
            providers: [
                AnalyticUsersStatusDistributionUseCase,
                {
                    provide: AnalyticUserService,
                    useValue: analyticUserService,
                },
            ],
        }).compile();

        useCase = module.get(AnalyticUsersStatusDistributionUseCase);
    });

    describe('execute', () => {
        it('wraps the domain result in the response envelope', async () => {
            analyticUserService.usersStatusDistribution.mockResolvedValue({
                buckets: [{ key: 'key-1', count: 7 }],
            });

            const result = await useCase.execute();

            expect(result).toEqual({
                data: { buckets: [{ key: 'key-1', count: 7 }] },
            });
            expect(
                analyticUserService.usersStatusDistribution
            ).toHaveBeenCalledWith();
        });
    });
});
