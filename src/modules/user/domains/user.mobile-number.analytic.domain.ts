import { ActivityLogAnalyticDomain } from '@modules/activity-log/domains/activity-log.analytic.domain';
import type {
    IAnalyticMetricRate,
    IAnalyticMobileChurn,
} from '@modules/analytic/interfaces/analytic.interface';
import { UserMobileNumberAnalyticRepository } from '@modules/user/repositories/user.mobile-number.analytic.repository';
import { Injectable } from '@nestjs/common';
import { EnumActivityLogAction } from '@generated/prisma-client/client';

@Injectable()
export class UserMobileNumberAnalyticDomain {
    constructor(
        private readonly userMobileNumberAnalyticRepository: UserMobileNumberAnalyticRepository,
        private readonly activityLogAnalyticDomain: ActivityLogAnalyticDomain
    ) {}

    async getVerificationRate(): Promise<IAnalyticMetricRate> {
        const [verified, total] = await Promise.all([
            this.userMobileNumberAnalyticRepository.countVerified(),
            this.userMobileNumberAnalyticRepository.countAll(),
        ]);
        return {
            count: verified,
            total,
            rate: total === 0 ? 0 : (verified / total) * 100,
        };
    }

    async getChurn(
        startDate: Date,
        endDate: Date
    ): Promise<IAnalyticMobileChurn> {
        const [added, updated, deleted] = await Promise.all([
            this.activityLogAnalyticDomain.getCountByActionsInRange(
                [EnumActivityLogAction.userAddMobileNumber],
                startDate,
                endDate
            ),
            this.activityLogAnalyticDomain.getCountByActionsInRange(
                [EnumActivityLogAction.userUpdateMobileNumber],
                startDate,
                endDate
            ),
            this.activityLogAnalyticDomain.getCountByActionsInRange(
                [EnumActivityLogAction.userDeleteMobileNumber],
                startDate,
                endDate
            ),
        ]);
        return { added, updated, deleted };
    }
}
