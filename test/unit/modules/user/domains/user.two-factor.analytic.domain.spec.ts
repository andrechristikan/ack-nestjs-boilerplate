import { Test } from '@nestjs/testing';
import type { TestingModule } from '@nestjs/testing';
import { mock } from 'vitest-mock-extended';
import type { MockProxy } from 'vitest-mock-extended';
import { HelperNumberService } from '@common/helper/services/helper.number.service';
import { UserTwoFactorAnalyticDomain } from '@modules/user/domains/user.two-factor.analytic.domain';
import { UserTwoFactorAnalyticRepository } from '@modules/user/repositories/user.two-factor.analytic.repository';

describe('UserTwoFactorAnalyticDomain', () => {
    const userTwoFactorAnalyticRepository: MockProxy<UserTwoFactorAnalyticRepository> =
        mock<UserTwoFactorAnalyticRepository>();
    const helperNumberService: MockProxy<HelperNumberService> =
        mock<HelperNumberService>();

    let domain: UserTwoFactorAnalyticDomain;

    beforeEach(async () => {
        vi.resetAllMocks();

        const module: TestingModule = await Test.createTestingModule({
            providers: [
                UserTwoFactorAnalyticDomain,
                {
                    provide: UserTwoFactorAnalyticRepository,
                    useValue: userTwoFactorAnalyticRepository,
                },
                {
                    provide: HelperNumberService,
                    useValue: helperNumberService,
                },
            ],
        }).compile();
        domain = module.get(UserTwoFactorAnalyticDomain);
    });

    describe('getEnabledCount', () => {
        it('delegates the enabled count to the repository', async () => {
            userTwoFactorAnalyticRepository.countEnabled.mockResolvedValue(4);

            await expect(domain.getEnabledCount()).resolves.toBe(4);
        });
    });

    describe('mapAdoption', () => {
        it('computes the rate from the enabled count and the active user count', () => {
            helperNumberService.percent.mockReturnValue(50);

            expect(domain.mapAdoption(4, 8)).toEqual({
                enabled: 4,
                total: 8,
                rate: 50,
            });
            expect(helperNumberService.percent).toHaveBeenCalledWith(4, 8);
        });
    });

    describe('getAttemptSnapshot', () => {
        it('delegates to the repository', async () => {
            const snapshot = { usersWithAttempts: 2, totalAttempts: 5 };
            userTwoFactorAnalyticRepository.findAttemptSnapshot.mockResolvedValue(
                snapshot
            );

            await expect(domain.getAttemptSnapshot()).resolves.toBe(snapshot);
        });
    });
});
