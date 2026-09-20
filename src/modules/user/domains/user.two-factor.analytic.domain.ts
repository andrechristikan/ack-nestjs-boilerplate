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

    async adoption(): Promise<IAnalyticTwoFactorAdoption> {
        const [enabled, total] = await Promise.all([
            this.userTwoFactorAnalyticRepository.countEnabled(),
            this.userAnalyticDomain.countActive(),
        ]);
        return {
            enabled,
            total,
            rate: total === 0 ? 0 : (enabled / total) * 100,
        };
    }

    adminResetCount(startDate: Date, endDate: Date): Promise<number> {
        return this.activityLogAnalyticDomain.countByActionsInRange(
            [EnumActivityLogAction.userResetTwoFactorByAdmin],
            startDate,
            endDate
        );
    }

    verifySuccessCount(startDate: Date, endDate: Date): Promise<number> {
        return this.activityLogAnalyticDomain.countByActionsInRange(
            [EnumActivityLogAction.userVerifyTwoFactor],
            startDate,
            endDate
        );
    }

    backupCodeRegenerationCount(
        startDate: Date,
        endDate: Date
    ): Promise<number> {
        return this.activityLogAnalyticDomain.countByActionsInRange(
            [EnumActivityLogAction.userRegenerateTwoFactorBackupCodes],
            startDate,
            endDate
        );
    }

    attemptSnapshot(): Promise<IAnalyticTwoFactorAttemptSnapshot> {
        return this.userTwoFactorAnalyticRepository.attemptSnapshot();
    }
}
