import { Test } from '@nestjs/testing';
import type { TestingModule } from '@nestjs/testing';
import { mock } from 'vitest-mock-extended';
import type { MockProxy } from 'vitest-mock-extended';
import { EnumActivityLogAction } from '@generated/prisma-client/client';
import { ActivityLogAnalyticDomain } from '@modules/activity-log/domains/activity-log.analytic.domain';
import { UserLoginAnalyticActions } from '@modules/user/constants/user.constant';
import { UserLoginAnalyticDomain } from '@modules/user/domains/user.login.analytic.domain';

describe('UserLoginAnalyticDomain', () => {
    const activityLogAnalyticDomain: MockProxy<ActivityLogAnalyticDomain> =
        mock<ActivityLogAnalyticDomain>();

    let domain: UserLoginAnalyticDomain;

    const startDate = new Date('2026-01-01T00:00:00.000Z');
    const endDate = new Date('2026-02-01T00:00:00.000Z');

    beforeEach(async () => {
        vi.resetAllMocks();

        const module: TestingModule = await Test.createTestingModule({
            providers: [
                UserLoginAnalyticDomain,
                {
                    provide: ActivityLogAnalyticDomain,
                    useValue: activityLogAnalyticDomain,
                },
            ],
        }).compile();
        domain = module.get(UserLoginAnalyticDomain);
    });

    describe('loginFrequency', () => {
        it('counts the login actions in range', async () => {
            activityLogAnalyticDomain.countByActionsInRange.mockResolvedValue(
                7
            );

            await expect(
                domain.loginFrequency(startDate, endDate)
            ).resolves.toBe(7);
            expect(
                activityLogAnalyticDomain.countByActionsInRange
            ).toHaveBeenCalledWith(
                UserLoginAnalyticActions,
                startDate,
                endDate
            );
        });
    });

    describe('loginMethodMix', () => {
        it('groups the login actions when dates are provided', async () => {
            const rows = [
                {
                    action: EnumActivityLogAction.userLoginCredential,
                    count: 3,
                },
            ];
            activityLogAnalyticDomain.groupByActionInRange.mockResolvedValue(
                rows
            );

            await expect(
                domain.loginMethodMix(startDate, endDate)
            ).resolves.toBe(rows);
            expect(
                activityLogAnalyticDomain.groupByActionInRange
            ).toHaveBeenCalledWith(
                UserLoginAnalyticActions,
                startDate,
                endDate
            );
        });

        it('groups the login actions with undefined dates when null is passed', async () => {
            const rows = [
                {
                    action: EnumActivityLogAction.userLoginCredential,
                    count: 3,
                },
            ];
            activityLogAnalyticDomain.groupByActionInRange.mockResolvedValue(
                rows
            );

            await domain.loginMethodMix(null, null);

            expect(
                activityLogAnalyticDomain.groupByActionInRange
            ).toHaveBeenCalledWith(
                UserLoginAnalyticActions,
                undefined,
                undefined
            );
        });
    });

    describe('lockoutMetrics', () => {
        it('combines the failed and max-attempt counts', async () => {
            activityLogAnalyticDomain.countByActionsInRange
                .mockResolvedValueOnce(5)
                .mockResolvedValueOnce(2);

            await expect(
                domain.lockoutMetrics(startDate, endDate)
            ).resolves.toEqual({ failed: 5, maxAttempt: 2 });
            expect(
                activityLogAnalyticDomain.countByActionsInRange
            ).toHaveBeenNthCalledWith(
                1,
                [EnumActivityLogAction.userLoginFailed],
                startDate,
                endDate
            );
            expect(
                activityLogAnalyticDomain.countByActionsInRange
            ).toHaveBeenNthCalledWith(
                2,
                [EnumActivityLogAction.userReachMaxPasswordAttempt],
                startDate,
                endDate
            );
        });
    });

    describe('findLoginEvents', () => {
        it('delegates to the activity log analytic domain', async () => {
            const rows = [
                {
                    id: 'activity-log-1',
                    userId: 'user-1',
                    action: EnumActivityLogAction.userLoginCredential,
                    ipAddress: '127.0.0.1',
                    createdAt: startDate,
                },
            ];
            activityLogAnalyticDomain.findManyByActionsInRange.mockResolvedValue(
                rows
            );

            await expect(
                domain.findLoginEvents(startDate, endDate)
            ).resolves.toBe(rows);
            expect(
                activityLogAnalyticDomain.findManyByActionsInRange
            ).toHaveBeenCalledWith(
                UserLoginAnalyticActions,
                startDate,
                endDate
            );
        });
    });

    describe('findFailedLoginEvents', () => {
        it('delegates to the activity log analytic domain with the failed actions', async () => {
            const rows = [
                {
                    id: 'activity-log-2',
                    userId: 'user-1',
                    action: EnumActivityLogAction.userLoginFailed,
                    ipAddress: '127.0.0.1',
                    createdAt: startDate,
                },
            ];
            activityLogAnalyticDomain.findManyByActionsInRange.mockResolvedValue(
                rows
            );

            await expect(
                domain.findFailedLoginEvents(startDate, endDate)
            ).resolves.toBe(rows);
            expect(
                activityLogAnalyticDomain.findManyByActionsInRange
            ).toHaveBeenCalledWith(
                [
                    EnumActivityLogAction.userLoginFailed,
                    EnumActivityLogAction.userReachMaxPasswordAttempt,
                ],
                startDate,
                endDate
            );
        });
    });
});
