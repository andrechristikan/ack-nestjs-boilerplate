import { HelperDateService } from '@common/helper/services/helper.date.service';
import type { IAnalyticDateRange } from '@modules/analytic/interfaces/analytic.interface';
import { Injectable } from '@nestjs/common';
import { Duration } from 'luxon';

@Injectable()
export class AnalyticDateUtil {
    constructor(private readonly helperDateService: HelperDateService) {}

    windowRange(windowMs: number): IAnalyticDateRange {
        const endDate = this.helperDateService.now();
        const startDate = this.helperDateService.backward(
            endDate,
            Duration.fromMillis(windowMs)
        );

        return { startDate, endDate };
    }
}
