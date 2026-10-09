import { ActivityLogAnalyticDomain } from '@modules/activity-log/domains/activity-log.analytic.domain';
import type {
    IActivityLogAnalytic,
    IActivityLogAnalyticActionCount,
} from '@modules/activity-log/interfaces/activity-log.interface';
import type { IAnalyticLockoutMetrics } from '@modules/analytic/interfaces/analytic.interface';
import { UserLoginAnalyticActions } from '@modules/user/constants/user.constant';
import { Injectable } from '@nestjs/common';
import { EnumActivityLogAction } from '@generated/prisma-client/client';

@Injectable()
export class UserLoginAnalyticDomain {
    constructor(
        private readonly activityLogAnalyticDomain: ActivityLogAnalyticDomain
    ) {}

    getLoginFrequency(startDate: Date, endDate: Date): Promise<number> {
        return this.activityLogAnalyticDomain.getCountByActionsInRange(
            UserLoginAnalyticActions,
            startDate,
            endDate
        );
    }

    getLoginMethodMix(
        startDate: Date | null,
        endDate: Date | null
    ): Promise<IActivityLogAnalyticActionCount[]> {
        return this.activityLogAnalyticDomain.getGroupByActionInRange(
            UserLoginAnalyticActions,
            startDate,
            endDate
        );
    }

    async getLockoutMetrics(
        startDate: Date,
        endDate: Date
    ): Promise<IAnalyticLockoutMetrics> {
        const [failed, maxAttempt] = await Promise.all([
            this.activityLogAnalyticDomain.getCountByActionsInRange(
                [EnumActivityLogAction.userLoginFailed],
                startDate,
                endDate
            ),
            this.activityLogAnalyticDomain.getCountByActionsInRange(
                [EnumActivityLogAction.userReachMaxPasswordAttempt],
                startDate,
                endDate
            ),
        ]);
        return { failed, maxAttempt };
    }

    getLoginActivityLogs(
        startDate: Date,
        endDate: Date
    ): Promise<IActivityLogAnalytic[]> {
        return this.activityLogAnalyticDomain.getManyByActionsInRange(
            UserLoginAnalyticActions,
            startDate,
            endDate
        );
    }

    getFailedLoginActivityLogs(
        startDate: Date,
        endDate: Date
    ): Promise<IActivityLogAnalytic[]> {
        return this.activityLogAnalyticDomain.getManyByActionsInRange(
            [
                EnumActivityLogAction.userLoginFailed,
                EnumActivityLogAction.userReachMaxPasswordAttempt,
            ],
            startDate,
            endDate
        );
    }
}
