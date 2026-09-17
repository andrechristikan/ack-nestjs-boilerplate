import { ActivityLogAnalyticDomain } from '@modules/activity-log/domains/activity-log.analytic.domain';
import type {
    IActivityLogAnalyticActionCount,
    IActivityLogAnalyticEventRow,
} from '@modules/activity-log/interfaces/activity-log.analytic.repository.interface';
import type { IAnalyticLockoutMetrics } from '@modules/analytic/interfaces/analytic.interface';
import { Injectable } from '@nestjs/common';
import { EnumActivityLogAction } from '@generated/prisma-client/client';

const LOGIN_ACTIONS = [
    EnumActivityLogAction.userLoginCredential,
    EnumActivityLogAction.userLoginGoogle,
    EnumActivityLogAction.userLoginApple,
];

@Injectable()
export class UserLoginAnalyticDomain {
    constructor(
        private readonly activityLogAnalyticDomain: ActivityLogAnalyticDomain
    ) {}

    loginFrequency(startDate: Date, endDate: Date): Promise<number> {
        return this.activityLogAnalyticDomain.countByActionsInRange(
            LOGIN_ACTIONS,
            startDate,
            endDate
        );
    }

    loginMethodMix(
        startDate: Date | null,
        endDate: Date | null
    ): Promise<IActivityLogAnalyticActionCount[]> {
        return this.activityLogAnalyticDomain.groupByActionInRange(
            LOGIN_ACTIONS,
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
    ): Promise<IActivityLogAnalyticEventRow[]> {
        return this.activityLogAnalyticDomain.findManyByActionsInRange(
            LOGIN_ACTIONS,
            startDate,
            endDate
        );
    }

    findFailedLoginEvents(
        startDate: Date,
        endDate: Date
    ): Promise<IActivityLogAnalyticEventRow[]> {
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
