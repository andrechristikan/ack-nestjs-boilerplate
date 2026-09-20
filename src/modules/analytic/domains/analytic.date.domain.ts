import { AnalyticInvalidDateRangeException } from '@modules/analytic/exceptions/analytic.invalid-date-range.exception';
import type {
    IAnalyticDateRange,
    IAnalyticOptionalDateRange,
} from '@modules/analytic/interfaces/analytic.interface';
import { Injectable } from '@nestjs/common';

@Injectable()
export class AnalyticDateDomain {
    requireRange(
        startDate: Date | null,
        endDate: Date | null
    ): IAnalyticDateRange {
        if (
            startDate === null ||
            endDate === null ||
            startDate.getTime() >= endDate.getTime()
        ) {
            throw new AnalyticInvalidDateRangeException();
        }
        return { startDate, endDate };
    }

    optionalRange(
        startDate: Date | null = null,
        endDate: Date | null = null
    ): IAnalyticOptionalDateRange {
        if (startDate !== null && endDate !== null) {
            return this.requireRange(startDate, endDate);
        }
        if (startDate !== null || endDate !== null) {
            throw new AnalyticInvalidDateRangeException();
        }
        return { startDate: null, endDate: null };
    }
}
