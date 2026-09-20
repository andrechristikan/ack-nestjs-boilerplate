import { HelperDateService } from '@common/helper/services/helper.date.service';
import type { IAnalyticPasswordExpiry } from '@modules/analytic/interfaces/analytic.interface';
import { PasswordHistoryAnalyticDomain } from '@modules/password-history/domains/password-history.analytic.domain';
import type { IPasswordHistoryAnalytic } from '@modules/password-history/interfaces/password-history.interface';
import { UserAnalyticDomain } from '@modules/user/domains/user.analytic.domain';
import { Injectable } from '@nestjs/common';
import { EnumPasswordHistoryType } from '@generated/prisma-client/client';

@Injectable()
export class UserPasswordAnalyticDomain {
    constructor(
        private readonly passwordHistoryAnalyticDomain: PasswordHistoryAnalyticDomain,
        private readonly userAnalyticDomain: UserAnalyticDomain,
        private readonly helperDateService: HelperDateService
    ) {}

    passwordChangeCount(startDate: Date, endDate: Date): Promise<number> {
        return this.passwordHistoryAnalyticDomain.countByTypeInRange(
            EnumPasswordHistoryType.profile,
            startDate,
            endDate
        );
    }

    adminForcePasswordCount(startDate: Date, endDate: Date): Promise<number> {
        return this.passwordHistoryAnalyticDomain.countByTypeInRange(
            EnumPasswordHistoryType.admin,
            startDate,
            endDate
        );
    }

    async passwordExpiryCompliance(): Promise<IAnalyticPasswordExpiry> {
        const now = this.helperDateService.create();
        const [expired, total] = await Promise.all([
            this.userAnalyticDomain.countPasswordExpired(now),
            this.userAnalyticDomain.countActive(),
        ]);
        return {
            expired,
            total,
            compliant: total - expired,
            rate: total === 0 ? 0 : ((total - expired) / total) * 100,
        };
    }

    findProfileChanges(
        startDate: Date,
        endDate: Date
    ): Promise<IPasswordHistoryAnalytic[]> {
        return this.passwordHistoryAnalyticDomain.findByTypeInRange(
            EnumPasswordHistoryType.profile,
            startDate,
            endDate
        );
    }
}
