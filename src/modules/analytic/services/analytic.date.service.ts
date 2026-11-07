import { AnalyticInvalidDateRangeException } from '@modules/analytic/exceptions/analytic.invalid-date-range.exception';
import type {
    IAnalyticDateRange,
    IAnalyticOptionalDateRange,
} from '@modules/analytic/interfaces/analytic.interface';
import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class AnalyticDateService {
    private readonly maxWindowInMs: number;

    constructor(private readonly configService: ConfigService) {
        this.maxWindowInMs = this.configService.get<number>(
            'analytic.maxWindowInMs'
        )!;
    }

    requireRange(startDate: Date, endDate: Date): IAnalyticDateRange {
        const spanInMs = endDate.getTime() - startDate.getTime();
        if (spanInMs <= 0 || spanInMs > this.maxWindowInMs) {
            throw new AnalyticInvalidDateRangeException();
        }
        return { startDate, endDate };
    }

    resolveWindow(windowMs: number | null, defaultInMs: number): number {
        if (windowMs === null) {
            return defaultInMs;
        }
        if (windowMs > this.maxWindowInMs) {
            throw new AnalyticInvalidDateRangeException();
        }
        return windowMs;
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
