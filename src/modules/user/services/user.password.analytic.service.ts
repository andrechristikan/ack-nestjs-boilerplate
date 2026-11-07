import { HelperDateService } from '@common/helper/services/helper.date.service';
import { HelperNumberService } from '@common/helper/services/helper.number.service';
import type { IAnalyticPasswordExpiry } from '@modules/analytic/interfaces/analytic.interface';
import { UserAnalyticService } from '@modules/user/services/user.analytic.service';
import { Injectable } from '@nestjs/common';

@Injectable()
export class UserPasswordAnalyticService {
    constructor(
        private readonly userAnalyticService: UserAnalyticService,
        private readonly helperDateService: HelperDateService,
        private readonly helperNumberService: HelperNumberService
    ) {}

    async getExpiredCount(): Promise<number> {
        const now = this.helperDateService.create();

        return await this.userAnalyticService.getCountPasswordExpired(now);
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
