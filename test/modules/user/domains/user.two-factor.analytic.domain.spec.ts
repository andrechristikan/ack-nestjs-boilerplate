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

    describe('adoption', () => {
        it('computes the rate when total is not zero', async () => {
            userTwoFactorAnalyticRepository.countEnabled.mockResolvedValue(4);
            userAnalyticDomain.countActive.mockResolvedValue(8);

            await expect(domain.adoption()).resolves.toEqual({
                enabled: 4,
                total: 8,
                rate: 50,
            });
        });

        it('returns a zero rate when total is zero', async () => {
            userTwoFactorAnalyticRepository.countEnabled.mockResolvedValue(0);
            userAnalyticDomain.countActive.mockResolvedValue(0);

            await expect(domain.adoption()).resolves.toEqual({
                enabled: 0,
                total: 0,
                rate: 0,
            });
        });
    });

    describe('adminResetCount', () => {
        it('counts admin two-factor resets', async () => {
            activityLogAnalyticDomain.countByActionsInRange.mockResolvedValue(
                3
            );

            await expect(
                domain.adminResetCount(startDate, endDate)
            ).resolves.toBe(3);
            expect(
                activityLogAnalyticDomain.countByActionsInRange
            ).toHaveBeenCalledWith(
                [EnumActivityLogAction.userResetTwoFactorByAdmin],
                startDate,
                endDate
            );
        });
    });

    describe('verifySuccessCount', () => {
        it('counts successful two-factor verifications', async () => {
            activityLogAnalyticDomain.countByActionsInRange.mockResolvedValue(
                6
            );

            await expect(
                domain.verifySuccessCount(startDate, endDate)
            ).resolves.toBe(6);
            expect(
                activityLogAnalyticDomain.countByActionsInRange
            ).toHaveBeenCalledWith(
                [EnumActivityLogAction.userVerifyTwoFactor],
                startDate,
                endDate
            );
        });
    });

    describe('backupCodeRegenerationCount', () => {
        it('counts backup-code regenerations', async () => {
            activityLogAnalyticDomain.countByActionsInRange.mockResolvedValue(
                2
            );

            await expect(
                domain.backupCodeRegenerationCount(startDate, endDate)
            ).resolves.toBe(2);
            expect(
                activityLogAnalyticDomain.countByActionsInRange
            ).toHaveBeenCalledWith(
                [EnumActivityLogAction.userRegenerateTwoFactorBackupCodes],
                startDate,
                endDate
            );
        });
    });

    describe('attemptSnapshot', () => {
        it('delegates to the repository', async () => {
            const snapshot = { usersWithAttempts: 2, totalAttempts: 5 };
            userTwoFactorAnalyticRepository.attemptSnapshot.mockResolvedValue(
                snapshot
            );

            await expect(domain.attemptSnapshot()).resolves.toBe(snapshot);
        });
    });
});
