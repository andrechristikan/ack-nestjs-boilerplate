import { ActivityLogAnalyticDomain } from '@modules/activity-log/domains/activity-log.analytic.domain';
import type {
    IAnalyticTwoFactorAdoption,
    IAnalyticTwoFactorAttemptSnapshot,
} from '@modules/analytic/interfaces/analytic.interface';
import { UserAnalyticDomain } from '@modules/user/domains/user.analytic.domain';
import { UserTwoFactorAnalyticRepository } from '@modules/user/repositories/user.two-factor.analytic.repository';
import { Injectable } from '@nestjs/common';
import { EnumActivityLogAction } from '@generated/prisma-client/client';

@Injectable()
export class UserTwoFactorAnalyticDomain {
    constructor(
        private readonly userTwoFactorAnalyticRepository: UserTwoFactorAnalyticRepository,
        private readonly userAnalyticDomain: UserAnalyticDomain,
        private readonly activityLogAnalyticDomain: ActivityLogAnalyticDomain
    ) {}

    async getAdoption(): Promise<IAnalyticTwoFactorAdoption> {
        const [enabled, total] = await Promise.all([
            this.userTwoFactorAnalyticRepository.countEnabled(),
            this.userAnalyticDomain.getCountActive(),
        ]);
        return {
            enabled,
            total,
            rate: total === 0 ? 0 : (enabled / total) * 100,
        };
    }

    getAdminResetCount(startDate: Date, endDate: Date): Promise<number> {
        return this.activityLogAnalyticDomain.getCountByActionsInRange(
            [EnumActivityLogAction.userResetTwoFactorByAdmin],
            startDate,
            endDate
        );
    }

    getVerifySuccessCount(startDate: Date, endDate: Date): Promise<number> {
        return this.activityLogAnalyticDomain.getCountByActionsInRange(
            [EnumActivityLogAction.userVerifyTwoFactor],
            startDate,
            endDate
        );
    }

    getBackupCodeRegenerationCount(
        startDate: Date,
        endDate: Date
    ): Promise<number> {
        return this.activityLogAnalyticDomain.getCountByActionsInRange(
            [EnumActivityLogAction.userRegenerateTwoFactorBackupCodes],
            startDate,
            endDate
        );
    }

    getAttemptSnapshot(): Promise<IAnalyticTwoFactorAttemptSnapshot> {
        return this.userTwoFactorAnalyticRepository.findAttemptSnapshot();
    }
}
