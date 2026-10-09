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

    describe('getLoginFrequency', () => {
        it('counts the login actions in range', async () => {
            activityLogAnalyticDomain.getCountByActionsInRange.mockResolvedValue(
                7
            );

            await expect(
                domain.getLoginFrequency(startDate, endDate)
            ).resolves.toBe(7);
            expect(
                activityLogAnalyticDomain.getCountByActionsInRange
            ).toHaveBeenCalledWith(
                UserLoginAnalyticActions,
                startDate,
                endDate
            );
        });
    });

    describe('getLoginMethodMix', () => {
        it('groups the login actions when dates are provided', async () => {
            const rows = [
                {
                    action: EnumActivityLogAction.userLoginCredential,
                    count: 3,
                },
            ];
            activityLogAnalyticDomain.getGroupByActionInRange.mockResolvedValue(
                rows
            );

            await expect(
                domain.getLoginMethodMix(startDate, endDate)
            ).resolves.toBe(rows);
            expect(
                activityLogAnalyticDomain.getGroupByActionInRange
            ).toHaveBeenCalledWith(
                UserLoginAnalyticActions,
                startDate,
                endDate
            );
        });

        it('groups the login actions with null dates when null is passed', async () => {
            const rows = [
                {
                    action: EnumActivityLogAction.userLoginCredential,
                    count: 3,
                },
            ];
            activityLogAnalyticDomain.getGroupByActionInRange.mockResolvedValue(
                rows
            );

            await domain.getLoginMethodMix(null, null);

            expect(
                activityLogAnalyticDomain.getGroupByActionInRange
            ).toHaveBeenCalledWith(UserLoginAnalyticActions, null, null);
        });
    });

    describe('getLockoutMetrics', () => {
        it('combines the failed and max-attempt counts', async () => {
            activityLogAnalyticDomain.getCountByActionsInRange
                .mockResolvedValueOnce(5)
                .mockResolvedValueOnce(2);

            await expect(
                domain.getLockoutMetrics(startDate, endDate)
            ).resolves.toEqual({ failed: 5, maxAttempt: 2 });
            expect(
                activityLogAnalyticDomain.getCountByActionsInRange
            ).toHaveBeenNthCalledWith(
                1,
                [EnumActivityLogAction.userLoginFailed],
                startDate,
                endDate
            );
            expect(
                activityLogAnalyticDomain.getCountByActionsInRange
            ).toHaveBeenNthCalledWith(
                2,
                [EnumActivityLogAction.userReachMaxPasswordAttempt],
                startDate,
                endDate
            );
        });
    });

    describe('getLoginActivityLogs', () => {
        it('delegates to the activity log analytic domain', async () => {
            const rows = [
                {
                    id: 'activity-log-1',
                    userId: 'user-1',
                    action: EnumActivityLogAction.userLoginCredential,
                    ipAddress: '127.0.0.1',
                    createdAt: startDate,
                    workspaceId: null,
                    userAgent: null,
                },
            ];
            activityLogAnalyticDomain.getManyByActionsInRange.mockResolvedValue(
                rows
            );

            await expect(
                domain.getLoginActivityLogs(startDate, endDate)
            ).resolves.toBe(rows);
            expect(
                activityLogAnalyticDomain.getManyByActionsInRange
            ).toHaveBeenCalledWith(
                UserLoginAnalyticActions,
                startDate,
                endDate
            );
        });
    });

    describe('getFailedLoginActivityLogs', () => {
        it('delegates to the activity log analytic domain with the failed actions', async () => {
            const rows = [
                {
                    id: 'activity-log-2',
                    userId: 'user-1',
                    action: EnumActivityLogAction.userLoginFailed,
                    ipAddress: '127.0.0.1',
                    createdAt: startDate,
                    workspaceId: null,
                    userAgent: null,
                },
            ];
            activityLogAnalyticDomain.getManyByActionsInRange.mockResolvedValue(
                rows
            );

            await expect(
                domain.getFailedLoginActivityLogs(startDate, endDate)
            ).resolves.toBe(rows);
            expect(
                activityLogAnalyticDomain.getManyByActionsInRange
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
