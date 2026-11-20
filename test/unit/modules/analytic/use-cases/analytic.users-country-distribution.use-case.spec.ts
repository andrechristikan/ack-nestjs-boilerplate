import { Test } from '@nestjs/testing';
import type { TestingModule } from '@nestjs/testing';
import { mock } from 'vitest-mock-extended';
import type { MockProxy } from 'vitest-mock-extended';
import { AnalyticUserService } from '@modules/analytic/services/analytic.user.service';
import { AnalyticUsersCountryDistributionUseCase } from '@modules/analytic/use-cases/analytic.users-country-distribution.use-case';

describe('AnalyticUsersCountryDistributionUseCase', () => {
    const analyticUserService: MockProxy<AnalyticUserService> =
        mock<AnalyticUserService>();

    let useCase: AnalyticUsersCountryDistributionUseCase;

    beforeEach(async () => {
        const module: TestingModule = await Test.createTestingModule({
            providers: [
                AnalyticUsersCountryDistributionUseCase,
                {
                    provide: AnalyticUserService,
                    useValue: analyticUserService,
                },
            ],
        }).compile();

        useCase = module.get(AnalyticUsersCountryDistributionUseCase);
    });

    describe('execute', () => {
        it('wraps the domain result in the response envelope', async () => {
            analyticUserService.usersCountryDistribution.mockResolvedValue({
                buckets: [{ key: 'key-1', count: 7 }],
            });

            const result = await useCase.execute();

            expect(result).toEqual({
                data: { buckets: [{ key: 'key-1', count: 7 }] },
            });
            expect(
                analyticUserService.usersCountryDistribution
            ).toHaveBeenCalledWith();
        });
    });
});
