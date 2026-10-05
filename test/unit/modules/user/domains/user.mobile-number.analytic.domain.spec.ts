import { Test } from '@nestjs/testing';
import type { TestingModule } from '@nestjs/testing';
import { mock } from 'vitest-mock-extended';
import type { MockProxy } from 'vitest-mock-extended';
import { EnumActivityLogAction } from '@generated/prisma-client/client';
import { ActivityLogAnalyticDomain } from '@modules/activity-log/domains/activity-log.analytic.domain';
import { UserMobileNumberAnalyticDomain } from '@modules/user/domains/user.mobile-number.analytic.domain';
import { UserMobileNumberAnalyticRepository } from '@modules/user/repositories/user.mobile-number.analytic.repository';

describe('UserMobileNumberAnalyticDomain', () => {
    const userMobileNumberAnalyticRepository: MockProxy<UserMobileNumberAnalyticRepository> =
        mock<UserMobileNumberAnalyticRepository>();
    const activityLogAnalyticDomain: MockProxy<ActivityLogAnalyticDomain> =
        mock<ActivityLogAnalyticDomain>();

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
                    provide: ActivityLogAnalyticDomain,
                    useValue: activityLogAnalyticDomain,
                },
            ],
        }).compile();
        domain = module.get(UserMobileNumberAnalyticDomain);
    });

    describe('getVerificationRate', () => {
        it('computes the rate when total is not zero', async () => {
            userMobileNumberAnalyticRepository.countVerified.mockResolvedValue(
                3
            );
            userMobileNumberAnalyticRepository.countAll.mockResolvedValue(6);

            await expect(domain.getVerificationRate()).resolves.toEqual({
                count: 3,
                total: 6,
                rate: 50,
            });
        });

        it('returns a zero rate when total is zero', async () => {
            userMobileNumberAnalyticRepository.countVerified.mockResolvedValue(
                0
            );
            userMobileNumberAnalyticRepository.countAll.mockResolvedValue(0);

            await expect(domain.getVerificationRate()).resolves.toEqual({
                count: 0,
                total: 0,
                rate: 0,
            });
        });
    });

    describe('getChurn', () => {
        it('combines added, updated and deleted counts', async () => {
            activityLogAnalyticDomain.getCountByActionsInRange
                .mockResolvedValueOnce(1)
                .mockResolvedValueOnce(2)
                .mockResolvedValueOnce(3);

            await expect(domain.getChurn(startDate, endDate)).resolves.toEqual({
                added: 1,
                updated: 2,
                deleted: 3,
            });
            expect(
                activityLogAnalyticDomain.getCountByActionsInRange
            ).toHaveBeenNthCalledWith(
                1,
                [EnumActivityLogAction.userAddMobileNumber],
                startDate,
                endDate
            );
            expect(
                activityLogAnalyticDomain.getCountByActionsInRange
            ).toHaveBeenNthCalledWith(
                2,
                [EnumActivityLogAction.userUpdateMobileNumber],
                startDate,
                endDate
            );
            expect(
                activityLogAnalyticDomain.getCountByActionsInRange
            ).toHaveBeenNthCalledWith(
                3,
                [EnumActivityLogAction.userDeleteMobileNumber],
                startDate,
                endDate
            );
        });
    });
});
