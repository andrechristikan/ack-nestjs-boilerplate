import { HelperNumberService } from '@common/helper/services/helper.number.service';
import type {
    IAnalyticMfaAdoption,
    IAnalyticMfaAttemptSnapshot,
} from '@modules/analytic/interfaces/analytic.interface';
import { MfaAnalyticRepository } from '@modules/mfa/repositories/mfa.analytic.repository';
import { Injectable } from '@nestjs/common';

@Injectable()
export class MfaAnalyticService {
    constructor(
        private readonly mfaAnalyticRepository: MfaAnalyticRepository,
        private readonly helperNumberService: HelperNumberService
    ) {}

    async getEnabledCount(): Promise<number> {
        return await this.mfaAnalyticRepository.countEnabled();
    }

    mapAdoption(
        enabled: number,
        activeUserCount: number
    ): IAnalyticMfaAdoption {
        const rate = this.helperNumberService.percent(enabled, activeUserCount);
        return { enabled, total: activeUserCount, rate };
    }

    async getAttemptSnapshot(): Promise<IAnalyticMfaAttemptSnapshot> {
        return await this.mfaAnalyticRepository.findAttemptSnapshot();
    }
}
