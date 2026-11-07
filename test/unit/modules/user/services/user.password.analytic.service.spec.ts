import { Test } from '@nestjs/testing';
import type { TestingModule } from '@nestjs/testing';
import { mock } from 'vitest-mock-extended';
import type { MockProxy } from 'vitest-mock-extended';
import { HelperDateService } from '@common/helper/services/helper.date.service';
import { HelperNumberService } from '@common/helper/services/helper.number.service';
import { UserAnalyticService } from '@modules/user/services/user.analytic.service';
import { UserPasswordAnalyticService } from '@modules/user/services/user.password.analytic.service';

describe('UserPasswordAnalyticService', () => {
    const userAnalyticService: MockProxy<UserAnalyticService> =
        mock<UserAnalyticService>();
    const helperDateService: MockProxy<HelperDateService> =
        mock<HelperDateService>();
    const helperNumberService: MockProxy<HelperNumberService> =
        mock<HelperNumberService>();

    let service: UserPasswordAnalyticService;

    const now = new Date('2026-03-01T00:00:00.000Z');

    beforeEach(async () => {
        vi.resetAllMocks();

        const module: TestingModule = await Test.createTestingModule({
            providers: [
                UserPasswordAnalyticService,
                {
                    provide: UserAnalyticService,
                    useValue: userAnalyticService,
                },
                { provide: HelperDateService, useValue: helperDateService },
                { provide: HelperNumberService, useValue: helperNumberService },
            ],
        }).compile();
        service = module.get(UserPasswordAnalyticService);
    });

    describe('getExpiredCount', () => {
        it('counts the passwords expired at the current time', async () => {
            helperDateService.create.mockReturnValue(now);
            userAnalyticService.getCountPasswordExpired.mockResolvedValue(3);

            await expect(service.getExpiredCount()).resolves.toBe(3);
            expect(
                userAnalyticService.getCountPasswordExpired
            ).toHaveBeenCalledWith(now);
        });
    });

    describe('mapExpiryCompliance', () => {
        it('computes the compliance rate from the expired count and the active user count', () => {
            helperNumberService.percent.mockReturnValue(70);

            expect(service.mapExpiryCompliance(3, 10)).toEqual({
                expired: 3,
                total: 10,
                compliant: 7,
                rate: 70,
            });
            expect(helperNumberService.percent).toHaveBeenCalledWith(7, 10);
        });
    });
});
