import { HelperStringService } from '@common/helper/services/helper.string.service';
import { AnalyticCacheEmptyToken } from '@modules/analytic/constants/analytic.constant';
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

    workspaceWindowToken(
        workspaceId: string,
        startDate: Date | null,
        endDate: Date | null
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
