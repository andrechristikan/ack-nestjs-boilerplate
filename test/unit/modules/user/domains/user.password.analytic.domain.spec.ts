import { Test } from '@nestjs/testing';
import type { TestingModule } from '@nestjs/testing';
import { mock } from 'vitest-mock-extended';
import type { MockProxy } from 'vitest-mock-extended';
import { HelperDateService } from '@common/helper/services/helper.date.service';
import { HelperNumberService } from '@common/helper/services/helper.number.service';
import { UserAnalyticDomain } from '@modules/user/domains/user.analytic.domain';
import { UserPasswordAnalyticDomain } from '@modules/user/domains/user.password.analytic.domain';

describe('UserPasswordAnalyticDomain', () => {
    const userAnalyticDomain: MockProxy<UserAnalyticDomain> =
        mock<UserAnalyticDomain>();
    const helperDateService: MockProxy<HelperDateService> =
        mock<HelperDateService>();
    const helperNumberService: MockProxy<HelperNumberService> =
        mock<HelperNumberService>();

    let domain: UserPasswordAnalyticDomain;

    const now = new Date('2026-03-01T00:00:00.000Z');

    beforeEach(async () => {
        vi.resetAllMocks();

        const module: TestingModule = await Test.createTestingModule({
            providers: [
                UserPasswordAnalyticDomain,
                {
                    provide: UserAnalyticDomain,
                    useValue: userAnalyticDomain,
                },
                { provide: HelperDateService, useValue: helperDateService },
                { provide: HelperNumberService, useValue: helperNumberService },
            ],
        }).compile();
        domain = module.get(UserPasswordAnalyticDomain);
    });

    describe('getExpiredCount', () => {
        it('counts the passwords expired at the current time', async () => {
            helperDateService.create.mockReturnValue(now);
            userAnalyticDomain.getCountPasswordExpired.mockResolvedValue(3);

            await expect(domain.getExpiredCount()).resolves.toBe(3);
            expect(
                userAnalyticDomain.getCountPasswordExpired
            ).toHaveBeenCalledWith(now);
        });
    });

    describe('mapExpiryCompliance', () => {
        it('computes the compliance rate from the expired count and the active user count', () => {
            helperNumberService.percent.mockReturnValue(70);

            expect(domain.mapExpiryCompliance(3, 10)).toEqual({
                expired: 3,
                total: 10,
                compliant: 7,
                rate: 70,
            });
            expect(helperNumberService.percent).toHaveBeenCalledWith(7, 10);
        });
    });
});
