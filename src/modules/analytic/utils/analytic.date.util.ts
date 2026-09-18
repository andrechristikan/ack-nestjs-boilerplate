import { HelperStringService } from '@common/helper/services/helper.string.service';
import { AnalyticInvalidDateRangeException } from '@modules/analytic/exceptions/analytic.invalid-date-range.exception';
import type {
    IAnalyticDateRange,
    IAnalyticOptionalDateRange,
} from '@modules/analytic/interfaces/analytic.interface';
import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class AnalyticDateUtil {
    private readonly windowTokenPattern: string;
    private readonly workspaceWindowTokenPattern: string;

    constructor(
        private readonly configService: ConfigService,
        private readonly helperStringService: HelperStringService
    ) {
        this.windowTokenPattern = this.configService.get<string>(
            'analytic.cache.windowTokenPattern'
        )!;
        this.workspaceWindowTokenPattern = this.configService.get<string>(
            'analytic.cache.workspaceWindowTokenPattern'
        )!;
    }

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

    windowToken(startDate?: Date, endDate?: Date): string {
        const startToken = this.cacheToken(startDate);
        const endToken = this.cacheToken(endDate);

        return this.helperStringService.fillPattern(this.windowTokenPattern, {
            start: startToken,
            end: endToken,
        });
    }

    workspaceWindowToken(
        workspaceId: string,
        startDate?: Date,
        endDate?: Date
    ): string {
        const startToken = this.cacheToken(startDate);
        const endToken = this.cacheToken(endDate);

        return this.helperStringService.fillPattern(
            this.workspaceWindowTokenPattern,
            {
                workspaceId,
                start: startToken,
                end: endToken,
            }
        );
    }
}
