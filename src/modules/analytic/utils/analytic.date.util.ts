import { AnalyticInvalidDateRangeException } from '@modules/analytic/exceptions/analytic.invalid-date-range.exception';
import {
    IAnalyticDateRange,
    IAnalyticOptionalDateRange,
} from '@modules/analytic/interfaces/analytic.interface';
import { Injectable } from '@nestjs/common';

@Injectable()
export class AnalyticDateUtil {
    requireRange(startDate?: Date, endDate?: Date): IAnalyticDateRange {
        if (
            !startDate ||
            !endDate ||
            startDate.getTime() >= endDate.getTime()
        ) {
            throw new AnalyticInvalidDateRangeException();
        }
        return { startDate, endDate };
    }

    optionalRange(
        startDate?: Date,
        endDate?: Date
    ): IAnalyticOptionalDateRange {
        if (startDate && endDate) {
            return this.requireRange(startDate, endDate);
        }
        if (startDate || endDate) {
            throw new AnalyticInvalidDateRangeException();
        }
        return {};
    }

    cacheToken(date?: Date): string {
        return date ? date.toISOString() : '_';
    }
}
