import { Test } from '@nestjs/testing';
import type { TestingModule } from '@nestjs/testing';
import { mock } from 'vitest-mock-extended';
import type { MockProxy } from 'vitest-mock-extended';
import { EnumPasswordHistoryType } from '@generated/prisma-client/client';
import { HelperDateService } from '@common/helper/services/helper.date.service';
import { PasswordHistoryAnalyticDomain } from '@modules/password-history/domains/password-history.analytic.domain';
import { UserAnalyticDomain } from '@modules/user/domains/user.analytic.domain';
import { UserPasswordAnalyticDomain } from '@modules/user/domains/user.password.analytic.domain';

describe('UserPasswordAnalyticDomain', () => {
    const passwordHistoryAnalyticDomain: MockProxy<PasswordHistoryAnalyticDomain> =
        mock<PasswordHistoryAnalyticDomain>();
    const userAnalyticDomain: MockProxy<UserAnalyticDomain> =
        mock<UserAnalyticDomain>();
    const helperDateService: MockProxy<HelperDateService> =
        mock<HelperDateService>();

    let domain: UserPasswordAnalyticDomain;

    const startDate = new Date('2026-01-01T00:00:00.000Z');
    const endDate = new Date('2026-02-01T00:00:00.000Z');
    const now = new Date('2026-03-01T00:00:00.000Z');

    beforeEach(async () => {
        vi.resetAllMocks();

        const module: TestingModule = await Test.createTestingModule({
            providers: [
                UserPasswordAnalyticDomain,
                {
                    provide: PasswordHistoryAnalyticDomain,
                    useValue: passwordHistoryAnalyticDomain,
                },
                {
                    provide: UserAnalyticDomain,
                    useValue: userAnalyticDomain,
                },
                { provide: HelperDateService, useValue: helperDateService },
            ],
        }).compile();
        domain = module.get(UserPasswordAnalyticDomain);
    });

    describe('passwordChangeCount', () => {
        it('counts profile password-history changes', async () => {
            passwordHistoryAnalyticDomain.countByTypeInRange.mockResolvedValue(
                4
            );

            await expect(
                domain.passwordChangeCount(startDate, endDate)
            ).resolves.toBe(4);
            expect(
                passwordHistoryAnalyticDomain.countByTypeInRange
            ).toHaveBeenCalledWith(
                EnumPasswordHistoryType.profile,
                startDate,
                endDate
            );
        });
    });

    describe('adminForcePasswordCount', () => {
        it('counts admin password-history changes', async () => {
            passwordHistoryAnalyticDomain.countByTypeInRange.mockResolvedValue(
                2
            );

            await expect(
                domain.adminForcePasswordCount(startDate, endDate)
            ).resolves.toBe(2);
            expect(
                passwordHistoryAnalyticDomain.countByTypeInRange
            ).toHaveBeenCalledWith(
                EnumPasswordHistoryType.admin,
                startDate,
                endDate
            );
        });
    });

    describe('passwordExpiryCompliance', () => {
        it('computes the compliance rate when total is not zero', async () => {
            helperDateService.create.mockReturnValue(now);
            userAnalyticDomain.countPasswordExpired.mockResolvedValue(3);
            userAnalyticDomain.countActive.mockResolvedValue(10);

            await expect(domain.passwordExpiryCompliance()).resolves.toEqual({
                expired: 3,
                total: 10,
                compliant: 7,
                rate: 70,
            });
            expect(
                userAnalyticDomain.countPasswordExpired
            ).toHaveBeenCalledWith(now);
        });

        it('returns a zero rate when total is zero', async () => {
            helperDateService.create.mockReturnValue(now);
            userAnalyticDomain.countPasswordExpired.mockResolvedValue(0);
            userAnalyticDomain.countActive.mockResolvedValue(0);

            await expect(domain.passwordExpiryCompliance()).resolves.toEqual({
                expired: 0,
                total: 0,
                compliant: 0,
                rate: 0,
            });
        });
    });

    describe('findProfileChanges', () => {
        it('delegates to the password-history analytic domain', async () => {
            const rows = [
                {
                    id: 'history-1',
                    userId: 'user-1',
                    type: EnumPasswordHistoryType.profile,
                    createdAt: startDate,
                },
            ];
            passwordHistoryAnalyticDomain.findByTypeInRange.mockResolvedValue(
                rows
            );

            await expect(
                domain.findProfileChanges(startDate, endDate)
            ).resolves.toBe(rows);
            expect(
                passwordHistoryAnalyticDomain.findByTypeInRange
            ).toHaveBeenCalledWith(
                EnumPasswordHistoryType.profile,
                startDate,
                endDate
            );
        });
    });
});
