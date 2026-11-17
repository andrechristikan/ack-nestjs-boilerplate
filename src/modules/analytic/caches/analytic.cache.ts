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
    private readonly riskScoreKeyPattern: string;
    readonly dashboardTtlInMs: number;
    readonly anomalySummaryTtlInMs: number;
    readonly fraudSummaryTtlInMs: number;
    readonly riskScoreTtlInMs: number;

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
        this.riskScoreKeyPattern = this.configService.get<string>(
            'analytic.cache.riskScoreKeyPattern'
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
        this.riskScoreTtlInMs = this.configService.get<number>(
            'analytic.cache.riskScoreTtlInMs'
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

    buildRiskScoreKey(userId: string): string {
        return this.riskScoreKeyPattern.replace('{userId}', () => userId);
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
