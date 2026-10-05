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

    describe('getPasswordChangeCount', () => {
        it('counts profile password-history changes', async () => {
            passwordHistoryAnalyticDomain.getCountByTypeInRange.mockResolvedValue(
                4
            );

            await expect(
                domain.getPasswordChangeCount(startDate, endDate)
            ).resolves.toBe(4);
            expect(
                passwordHistoryAnalyticDomain.getCountByTypeInRange
            ).toHaveBeenCalledWith(
                EnumPasswordHistoryType.profile,
                startDate,
                endDate
            );
        });
    });

    describe('getAdminForcePasswordCount', () => {
        it('counts admin password-history changes', async () => {
            passwordHistoryAnalyticDomain.getCountByTypeInRange.mockResolvedValue(
                2
            );

            await expect(
                domain.getAdminForcePasswordCount(startDate, endDate)
            ).resolves.toBe(2);
            expect(
                passwordHistoryAnalyticDomain.getCountByTypeInRange
            ).toHaveBeenCalledWith(
                EnumPasswordHistoryType.admin,
                startDate,
                endDate
            );
        });
    });

    describe('getPasswordExpiryCompliance', () => {
        it('computes the compliance rate when total is not zero', async () => {
            helperDateService.create.mockReturnValue(now);
            userAnalyticDomain.getCountPasswordExpired.mockResolvedValue(3);
            userAnalyticDomain.getCountActive.mockResolvedValue(10);

            await expect(domain.getPasswordExpiryCompliance()).resolves.toEqual(
                {
                    expired: 3,
                    total: 10,
                    compliant: 7,
                    rate: 70,
                }
            );
            expect(
                userAnalyticDomain.getCountPasswordExpired
            ).toHaveBeenCalledWith(now);
        });

        it('returns a zero rate when total is zero', async () => {
            helperDateService.create.mockReturnValue(now);
            userAnalyticDomain.getCountPasswordExpired.mockResolvedValue(0);
            userAnalyticDomain.getCountActive.mockResolvedValue(0);

            await expect(domain.getPasswordExpiryCompliance()).resolves.toEqual(
                {
                    expired: 0,
                    total: 0,
                    compliant: 0,
                    rate: 0,
                }
            );
        });
    });

    describe('getProfileChanges', () => {
        it('delegates to the password-history analytic domain', async () => {
            const rows = [
                {
                    id: 'history-1',
                    userId: 'user-1',
                    type: EnumPasswordHistoryType.profile,
                    createdAt: startDate,
                },
            ];
            passwordHistoryAnalyticDomain.getByTypeInRange.mockResolvedValue(
                rows
            );

            await expect(
                domain.getProfileChanges(startDate, endDate)
            ).resolves.toBe(rows);
            expect(
                passwordHistoryAnalyticDomain.getByTypeInRange
            ).toHaveBeenCalledWith(
                EnumPasswordHistoryType.profile,
                startDate,
                endDate
            );
        });
    });
});
