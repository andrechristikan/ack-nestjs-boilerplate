import { HelperNumberService } from '@common/helper/services/helper.number.service';
import type { IAnalyticMetricRate } from '@modules/analytic/interfaces/analytic.interface';
import { UserMobileNumberAnalyticRepository } from '@modules/user/repositories/user.mobile-number.analytic.repository';
import { Injectable } from '@nestjs/common';

@Injectable()
export class UserMobileNumberAnalyticService {
    constructor(
        private readonly userMobileNumberAnalyticRepository: UserMobileNumberAnalyticRepository,
        private readonly helperNumberService: HelperNumberService
    ) {}

    async getVerificationRate(
        startDate: Date | null,
        endDate: Date | null
    ): Promise<IAnalyticMetricRate> {
        const [verified, total] = await Promise.all([
            this.userMobileNumberAnalyticRepository.countVerified(
                startDate,
                endDate
            ),
            this.userMobileNumberAnalyticRepository.countAll(
                startDate,
                endDate
            ),
        ]);
        const rate = this.helperNumberService.percent(verified, total);
        return { count: verified, total, rate };
    }
}
