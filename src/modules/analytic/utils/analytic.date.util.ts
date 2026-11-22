import { HelperDateService } from '@common/helper/services/helper.date.service';
import { HelperStringService } from '@common/helper/services/helper.string.service';
import { AnalyticCacheEmptyToken } from '@modules/analytic/constants/analytic.constant';
import type { IAnalyticDateRange } from '@modules/analytic/interfaces/analytic.interface';
import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Duration } from 'luxon';

@Injectable()
export class AnalyticDateUtil {
    private readonly windowTokenPattern: string;

    constructor(
        private readonly configService: ConfigService,
        private readonly helperStringService: HelperStringService,
        private readonly helperDateService: HelperDateService
    ) {
        this.windowTokenPattern = this.configService.get<string>(
            'analytic.cache.windowTokenPattern'
        )!;
    }

    cacheToken(date: Date | null): string {
        return date ? date.toISOString() : AnalyticCacheEmptyToken;
    }

    windowToken(startDate: Date | null, endDate: Date | null): string {
        const startToken = this.cacheToken(startDate);
        const endToken = this.cacheToken(endDate);

        return this.helperStringService.fillPattern(this.windowTokenPattern, {
            start: startToken,
            end: endToken,
        });
    }

    windowRange(windowMs: number): IAnalyticDateRange {
        const endDate = this.helperDateService.create();
        const startDate = this.helperDateService.backward(
            endDate,
            Duration.fromMillis(windowMs)
        );

        return { startDate, endDate };
    }
}
