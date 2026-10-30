import { Test } from '@nestjs/testing';
import type { TestingModule } from '@nestjs/testing';
import { mock } from 'vitest-mock-extended';
import type { MockProxy } from 'vitest-mock-extended';
import { HelperNumberService } from '@common/helper/services/helper.number.service';
import { UserForgotPasswordAnalyticDomain } from '@modules/user/domains/user.forgot-password.analytic.domain';
import { UserForgotPasswordAnalyticRepository } from '@modules/user/repositories/user.forgot-password.analytic.repository';

describe('UserForgotPasswordAnalyticDomain', () => {
    const userForgotPasswordAnalyticRepository: MockProxy<UserForgotPasswordAnalyticRepository> =
        mock<UserForgotPasswordAnalyticRepository>();
    const helperNumberService: MockProxy<HelperNumberService> =
        mock<HelperNumberService>();

    let domain: UserForgotPasswordAnalyticDomain;

    const startDate = new Date('2026-01-01T00:00:00.000Z');
    const endDate = new Date('2026-02-01T00:00:00.000Z');

    beforeEach(async () => {
        vi.resetAllMocks();

        const module: TestingModule = await Test.createTestingModule({
            providers: [
                UserForgotPasswordAnalyticDomain,
                {
                    provide: UserForgotPasswordAnalyticRepository,
                    useValue: userForgotPasswordAnalyticRepository,
                },
                { provide: HelperNumberService, useValue: helperNumberService },
            ],
        }).compile();
        domain = module.get(UserForgotPasswordAnalyticDomain);
    });

    describe('getConversion', () => {
        it('computes the rate when created is not zero', async () => {
            userForgotPasswordAnalyticRepository.countCreated.mockResolvedValue(
                10
            );
            userForgotPasswordAnalyticRepository.countUsed.mockResolvedValue(4);
            helperNumberService.percent.mockReturnValue(40);

            await expect(
                domain.getConversion(startDate, endDate)
            ).resolves.toEqual({
                created: 10,
                used: 4,
                rate: 40,
            });
            expect(
                userForgotPasswordAnalyticRepository.countCreated
            ).toHaveBeenCalledWith(startDate, endDate);
            expect(
                userForgotPasswordAnalyticRepository.countUsed
            ).toHaveBeenCalledWith(startDate, endDate);
            expect(helperNumberService.percent).toHaveBeenCalledWith(4, 10);
        });

        it('returns the rate the number service gives when created is zero', async () => {
            userForgotPasswordAnalyticRepository.countCreated.mockResolvedValue(
                0
            );
            userForgotPasswordAnalyticRepository.countUsed.mockResolvedValue(0);
            helperNumberService.percent.mockReturnValue(0);

            await expect(
                domain.getConversion(startDate, endDate)
            ).resolves.toEqual({
                created: 0,
                used: 0,
                rate: 0,
            });
        });
    });

    describe('getUnusedTokenCountsByUser', () => {
        it('delegates to the repository', async () => {
            const rows = [{ userId: 'user-1', count: 2 }];
            userForgotPasswordAnalyticRepository.groupUnusedTokenByUser.mockResolvedValue(
                rows
            );

            await expect(
                domain.getUnusedTokenCountsByUser(startDate, endDate)
            ).resolves.toBe(rows);
            expect(
                userForgotPasswordAnalyticRepository.groupUnusedTokenByUser
            ).toHaveBeenCalledWith(startDate, endDate);
        });
    });
});
