import { HelperNumberService } from '@common/helper/services/helper.number.service';
import type {
    IAnalyticTwoFactorAdoption,
    IAnalyticTwoFactorAttemptSnapshot,
} from '@modules/analytic/interfaces/analytic.interface';
import { UserTwoFactorAnalyticRepository } from '@modules/user/repositories/user.two-factor.analytic.repository';
import { Injectable } from '@nestjs/common';

@Injectable()
export class UserTwoFactorAnalyticDomain {
    constructor(
        private readonly userTwoFactorAnalyticRepository: UserTwoFactorAnalyticRepository,
        private readonly helperNumberService: HelperNumberService
    ) {}

    async getEnabledCount(): Promise<number> {
        return await this.userTwoFactorAnalyticRepository.countEnabled();
    }

    mapAdoption(
        enabled: number,
        activeUserCount: number
    ): IAnalyticTwoFactorAdoption {
        const rate = this.helperNumberService.percent(enabled, activeUserCount);
        return { enabled, total: activeUserCount, rate };
    }

    async getAttemptSnapshot(): Promise<IAnalyticTwoFactorAttemptSnapshot> {
        return await this.userTwoFactorAnalyticRepository.findAttemptSnapshot();
    }
}
