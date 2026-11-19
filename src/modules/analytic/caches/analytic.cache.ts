import { HelperStringService } from '@common/helper/services/helper.string.service';
import type {
    EnumAnalyticAnomalySignal,
    EnumAnalyticFraudSignal,
} from '@modules/analytic/enums/analytic.enum';
import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class AnalyticCache {
    private readonly dashboardKeyPattern: string;
    private readonly dashboardPageKeyPattern: string;
    private readonly workspaceSummaryKeyPattern: string;
    private readonly anomalySummaryKeyPattern: string;
    private readonly fraudSummaryKeyPattern: string;
    readonly dashboardTtlInMs: number;
    readonly anomalySummaryTtlInMs: number;
    readonly fraudSummaryTtlInMs: number;
    readonly liveSummaryTtlInMs: number;

    constructor(
        private readonly configService: ConfigService,
        private readonly helperStringService: HelperStringService
    ) {
        this.dashboardKeyPattern = this.configService.get<string>(
            'analytic.cache.dashboardKeyPattern'
        )!;
        this.dashboardPageKeyPattern = this.configService.get<string>(
            'analytic.cache.dashboardPageKeyPattern'
        )!;
        this.workspaceSummaryKeyPattern = this.configService.get<string>(
            'analytic.cache.workspaceSummaryKeyPattern'
        )!;
        this.anomalySummaryKeyPattern = this.configService.get<string>(
            'analytic.cache.anomalySummaryKeyPattern'
        )!;
        this.fraudSummaryKeyPattern = this.configService.get<string>(
            'analytic.cache.fraudSummaryKeyPattern'
        )!;
        this.dashboardTtlInMs = this.configService.get<number>(
            'analytic.cache.dashboardTtlInMs'
        )!;
        this.anomalySummaryTtlInMs = this.configService.get<number>(
            'analytic.cache.anomalySummaryTtlInMs'
        )!;
        this.fraudSummaryTtlInMs = this.configService.get<number>(
            'analytic.cache.fraudSummaryTtlInMs'
        )!;
        this.liveSummaryTtlInMs = this.configService.get<number>(
            'analytic.cache.liveSummaryTtlInMs'
        )!;
    }

    buildAnomalySummaryKey(
        signal: EnumAnalyticAnomalySignal,
        window: string
    ): string {
        return this.helperStringService.fillPattern(
            this.anomalySummaryKeyPattern,
            {
                signal,
                window,
            }
        );
    }

    buildFraudSummaryKey(
        signal: EnumAnalyticFraudSignal,
        window: string
    ): string {
        return this.helperStringService.fillPattern(
            this.fraudSummaryKeyPattern,
            {
                signal,
                window,
            }
        );
    }

    buildDashboardKey(metric: string, start: string, end: string): string {
        return this.helperStringService.fillPattern(this.dashboardKeyPattern, {
            metric,
            start,
            end,
        });
    }

    buildDashboardPageKey(
        metric: string,
        start: string,
        end: string,
        page: number,
        perPage: number
    ): string {
        return this.helperStringService.fillPattern(
            this.dashboardPageKeyPattern,
            {
                metric,
                start,
                end,
                page: String(page),
                perPage: String(perPage),
            }
        );
    }

    buildWorkspaceSummaryKey(
        workspaceId: string,
        start: string,
        end: string
    ): string {
        return this.helperStringService.fillPattern(
            this.workspaceSummaryKeyPattern,
            { workspaceId, start, end }
        );
    }
}
