import { HelperNumberService } from '@common/helper/services/helper.number.service';
import type { IAnalyticMfaAdoptionRate } from '@modules/analytic/interfaces/analytic.interface';
import { Injectable } from '@nestjs/common';

@Injectable()
export class MfaUtil {
    constructor(private readonly helperNumberService: HelperNumberService) {}

    mapAdoption(
        enabled: number,
        activeUserCount: number
    ): IAnalyticMfaAdoptionRate {
        const rate = this.helperNumberService.percent(enabled, activeUserCount);
        return { enabled, total: activeUserCount, rate };
    }
}
