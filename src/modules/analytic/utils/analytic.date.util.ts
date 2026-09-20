import { HelperStringService } from '@common/helper/services/helper.string.service';
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
