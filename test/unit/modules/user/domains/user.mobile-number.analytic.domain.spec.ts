import { Test } from '@nestjs/testing';
import type { TestingModule } from '@nestjs/testing';
import { mock } from 'vitest-mock-extended';
import type { MockProxy } from 'vitest-mock-extended';
import { HelperNumberService } from '@common/helper/services/helper.number.service';
import { UserMobileNumberAnalyticDomain } from '@modules/user/domains/user.mobile-number.analytic.domain';
import { UserMobileNumberAnalyticRepository } from '@modules/user/repositories/user.mobile-number.analytic.repository';

describe('UserMobileNumberAnalyticDomain', () => {
    const userMobileNumberAnalyticRepository: MockProxy<UserMobileNumberAnalyticRepository> =
        mock<UserMobileNumberAnalyticRepository>();
    const helperNumberService: MockProxy<HelperNumberService> =
        mock<HelperNumberService>();

    let domain: UserMobileNumberAnalyticDomain;

    const startDate = new Date('2026-01-01T00:00:00.000Z');
    const endDate = new Date('2026-02-01T00:00:00.000Z');

    beforeEach(async () => {
        vi.resetAllMocks();

        const module: TestingModule = await Test.createTestingModule({
            providers: [
                UserMobileNumberAnalyticDomain,
                {
                    provide: UserMobileNumberAnalyticRepository,
                    useValue: userMobileNumberAnalyticRepository,
                },
                {
                    provide: HelperNumberService,
                    useValue: helperNumberService,
                },
            ],
        }).compile();
        domain = module.get(UserMobileNumberAnalyticDomain);
    });

    describe('getVerificationRate', () => {
        it('computes the rate from the verified count and the total', async () => {
            userMobileNumberAnalyticRepository.countVerified.mockResolvedValue(
                3
            );
            userMobileNumberAnalyticRepository.countAll.mockResolvedValue(6);
            helperNumberService.percent.mockReturnValue(50);

            await expect(
                domain.getVerificationRate(startDate, endDate)
            ).resolves.toEqual({
                count: 3,
                total: 6,
                rate: 50,
            });
            expect(
                userMobileNumberAnalyticRepository.countVerified
            ).toHaveBeenCalledWith(startDate, endDate);
            expect(
                userMobileNumberAnalyticRepository.countAll
            ).toHaveBeenCalledWith(startDate, endDate);
            expect(helperNumberService.percent).toHaveBeenCalledWith(3, 6);
        });

        it('passes open date bounds to the repository', async () => {
            userMobileNumberAnalyticRepository.countVerified.mockResolvedValue(
                0
            );
            userMobileNumberAnalyticRepository.countAll.mockResolvedValue(0);
            helperNumberService.percent.mockReturnValue(0);

            await expect(
                domain.getVerificationRate(null, null)
            ).resolves.toEqual({
                count: 0,
                total: 0,
                rate: 0,
            });
            expect(
                userMobileNumberAnalyticRepository.countAll
            ).toHaveBeenCalledWith(null, null);
        });
    });
});
