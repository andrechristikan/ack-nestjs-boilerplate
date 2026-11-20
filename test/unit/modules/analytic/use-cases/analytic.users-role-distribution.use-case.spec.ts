import { Test } from '@nestjs/testing';
import type { TestingModule } from '@nestjs/testing';
import { mock } from 'vitest-mock-extended';
import type { MockProxy } from 'vitest-mock-extended';
import { AnalyticUserService } from '@modules/analytic/services/analytic.user.service';
import { AnalyticUsersRoleDistributionUseCase } from '@modules/analytic/use-cases/analytic.users-role-distribution.use-case';

describe('AnalyticUsersRoleDistributionUseCase', () => {
    const analyticUserService: MockProxy<AnalyticUserService> =
        mock<AnalyticUserService>();

    let useCase: AnalyticUsersRoleDistributionUseCase;

    beforeEach(async () => {
        const module: TestingModule = await Test.createTestingModule({
            providers: [
                AnalyticUsersRoleDistributionUseCase,
                {
                    provide: AnalyticUserService,
                    useValue: analyticUserService,
                },
            ],
        }).compile();

        useCase = module.get(AnalyticUsersRoleDistributionUseCase);
    });

    describe('execute', () => {
        it('wraps the domain result in the response envelope', async () => {
            analyticUserService.usersRoleDistribution.mockResolvedValue({
                buckets: [{ key: 'key-1', count: 7 }],
            });

            const result = await useCase.execute();

            expect(result).toEqual({
                data: { buckets: [{ key: 'key-1', count: 7 }] },
            });
            expect(
                analyticUserService.usersRoleDistribution
            ).toHaveBeenCalledWith();
        });
    });
});
