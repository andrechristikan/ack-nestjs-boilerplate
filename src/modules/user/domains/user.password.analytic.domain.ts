import { HelperDateService } from '@common/helper/services/helper.date.service';
import { HelperNumberService } from '@common/helper/services/helper.number.service';
import type { IAnalyticPasswordExpiry } from '@modules/analytic/interfaces/analytic.interface';
import { UserAnalyticDomain } from '@modules/user/domains/user.analytic.domain';
import { Injectable } from '@nestjs/common';

@Injectable()
export class UserPasswordAnalyticDomain {
    constructor(
        private readonly userAnalyticDomain: UserAnalyticDomain,
        private readonly helperDateService: HelperDateService,
        private readonly helperNumberService: HelperNumberService
    ) {}

    getExpiredCount(): Promise<number> {
        const now = this.helperDateService.create();

        return this.userAnalyticDomain.getCountPasswordExpired(now);
    }

    mapExpiryCompliance(
        expired: number,
        activeUserCount: number
    ): IAnalyticPasswordExpiry {
        const compliant = activeUserCount - expired;
        const rate = this.helperNumberService.percent(
            compliant,
            activeUserCount
        );
        return { expired, total: activeUserCount, compliant, rate };
    }
}
