import { Test } from '@nestjs/testing';
import type { TestingModule } from '@nestjs/testing';
import { mock } from 'vitest-mock-extended';
import type { MockProxy } from 'vitest-mock-extended';
import { EnumActivityLogAction } from '@generated/prisma-client/client';
import { ActivityLogAnalyticDomain } from '@modules/activity-log/domains/activity-log.analytic.domain';
import { UserAnalyticDomain } from '@modules/user/domains/user.analytic.domain';
import { UserTwoFactorAnalyticDomain } from '@modules/user/domains/user.two-factor.analytic.domain';
import { UserTwoFactorAnalyticRepository } from '@modules/user/repositories/user.two-factor.analytic.repository';

describe('UserTwoFactorAnalyticDomain', () => {
    const userTwoFactorAnalyticRepository: MockProxy<UserTwoFactorAnalyticRepository> =
        mock<UserTwoFactorAnalyticRepository>();
    const userAnalyticDomain: MockProxy<UserAnalyticDomain> =
        mock<UserAnalyticDomain>();
    const activityLogAnalyticDomain: MockProxy<ActivityLogAnalyticDomain> =
        mock<ActivityLogAnalyticDomain>();

    let domain: UserTwoFactorAnalyticDomain;

    const startDate = new Date('2026-01-01T00:00:00.000Z');
    const endDate = new Date('2026-02-01T00:00:00.000Z');

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
                    provide: UserAnalyticDomain,
                    useValue: userAnalyticDomain,
                },
                {
                    provide: ActivityLogAnalyticDomain,
                    useValue: activityLogAnalyticDomain,
                },
            ],
        }).compile();
        domain = module.get(UserTwoFactorAnalyticDomain);
    });

    describe('getAdoption', () => {
        it('computes the rate when total is not zero', async () => {
            userTwoFactorAnalyticRepository.countEnabled.mockResolvedValue(4);
            userAnalyticDomain.getCountActive.mockResolvedValue(8);

            await expect(domain.getAdoption()).resolves.toEqual({
                enabled: 4,
                total: 8,
                rate: 50,
            });
        });

        it('returns a zero rate when total is zero', async () => {
            userTwoFactorAnalyticRepository.countEnabled.mockResolvedValue(0);
            userAnalyticDomain.getCountActive.mockResolvedValue(0);

            await expect(domain.getAdoption()).resolves.toEqual({
                enabled: 0,
                total: 0,
                rate: 0,
            });
        });
    });

    describe('getAdminResetCount', () => {
        it('counts admin two-factor resets', async () => {
            activityLogAnalyticDomain.getCountByActionsInRange.mockResolvedValue(
                3
            );

            await expect(
                domain.getAdminResetCount(startDate, endDate)
            ).resolves.toBe(3);
            expect(
                activityLogAnalyticDomain.getCountByActionsInRange
            ).toHaveBeenCalledWith(
                [EnumActivityLogAction.userResetTwoFactorByAdmin],
                startDate,
                endDate
            );
        });
    });

    describe('getVerifySuccessCount', () => {
        it('counts successful two-factor verifications', async () => {
            activityLogAnalyticDomain.getCountByActionsInRange.mockResolvedValue(
                6
            );

            await expect(
                domain.getVerifySuccessCount(startDate, endDate)
            ).resolves.toBe(6);
            expect(
                activityLogAnalyticDomain.getCountByActionsInRange
            ).toHaveBeenCalledWith(
                [EnumActivityLogAction.userVerifyTwoFactor],
                startDate,
                endDate
            );
        });
    });

    describe('getBackupCodeRegenerationCount', () => {
        it('counts backup-code regenerations', async () => {
            activityLogAnalyticDomain.getCountByActionsInRange.mockResolvedValue(
                2
            );

            await expect(
                domain.getBackupCodeRegenerationCount(startDate, endDate)
            ).resolves.toBe(2);
            expect(
                activityLogAnalyticDomain.getCountByActionsInRange
            ).toHaveBeenCalledWith(
                [EnumActivityLogAction.userRegenerateTwoFactorBackupCodes],
                startDate,
                endDate
            );
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
