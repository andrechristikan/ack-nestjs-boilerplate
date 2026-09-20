import { ActivityLogAnalyticDomain } from '@modules/activity-log/domains/activity-log.analytic.domain';
import type {
    IActivityLogAnalyticActionCount,
    IActivityLogAnalyticEvent,
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

    loginFrequency(startDate: Date, endDate: Date): Promise<number> {
        return this.activityLogAnalyticDomain.countByActionsInRange(
            UserLoginAnalyticActions,
            startDate,
            endDate
        );
    }

    loginMethodMix(
        startDate: Date | null,
        endDate: Date | null
    ): Promise<IActivityLogAnalyticActionCount[]> {
        return this.activityLogAnalyticDomain.groupByActionInRange(
            UserLoginAnalyticActions,
            startDate ?? undefined,
            endDate ?? undefined
        );
    }

    async lockoutMetrics(
        startDate: Date,
        endDate: Date
    ): Promise<IAnalyticLockoutMetrics> {
        const [failed, maxAttempt] = await Promise.all([
            this.activityLogAnalyticDomain.countByActionsInRange(
                [EnumActivityLogAction.userLoginFailed],
                startDate,
                endDate
            ),
            this.activityLogAnalyticDomain.countByActionsInRange(
                [EnumActivityLogAction.userReachMaxPasswordAttempt],
                startDate,
                endDate
            ),
        ]);
        return { failed, maxAttempt };
    }

    findLoginEvents(
        startDate: Date,
        endDate: Date
    ): Promise<IActivityLogAnalyticEvent[]> {
        return this.activityLogAnalyticDomain.findManyByActionsInRange(
            UserLoginAnalyticActions,
            startDate,
            endDate
        );
    }

    findFailedLoginEvents(
        startDate: Date,
        endDate: Date
    ): Promise<IActivityLogAnalyticEvent[]> {
        return this.activityLogAnalyticDomain.findManyByActionsInRange(
            [
                EnumActivityLogAction.userLoginFailed,
                EnumActivityLogAction.userReachMaxPasswordAttempt,
            ],
            startDate,
            endDate
        );
    }
}
