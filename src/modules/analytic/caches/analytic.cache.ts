import { HelperStringService } from '@common/helper/services/helper.string.service';
import { AnalyticCacheEmptyToken } from '@modules/analytic/constants/analytic.constant';
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
    private readonly workspaceInviteFunnelKeyPattern: string;
    private readonly workspaceJoinOutcomesKeyPattern: string;
    private readonly workspaceMemberRolesKeyPattern: string;
    private readonly anomalySummaryKeyPattern: string;
    private readonly fraudSummaryKeyPattern: string;
    readonly dashboardTtlInMs: number;
    readonly anomalySummaryTtlInMs: number;
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
        this.workspaceInviteFunnelKeyPattern = this.configService.get<string>(
            'analytic.cache.workspaceInviteFunnelKeyPattern'
        )!;
        this.workspaceJoinOutcomesKeyPattern = this.configService.get<string>(
            'analytic.cache.workspaceJoinOutcomesKeyPattern'
        )!;
        this.workspaceMemberRolesKeyPattern = this.configService.get<string>(
            'analytic.cache.workspaceMemberRolesKeyPattern'
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
        this.liveSummaryTtlInMs = this.configService.get<number>(
            'analytic.cache.liveSummaryTtlInMs'
        )!;
    }

    private toToken(date: Date | null): string {
        return date ? date.toISOString() : AnalyticCacheEmptyToken;
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

    buildDashboardKey(
        metric: string,
        startDate: Date | null,
        endDate: Date | null
    ): string {
        const start = this.toToken(startDate);
        const end = this.toToken(endDate);

        return this.helperStringService.fillPattern(this.dashboardKeyPattern, {
            metric,
            start,
            end,
        });
    }

    buildDashboardPageKey(
        metric: string,
        startDate: Date | null,
        endDate: Date | null,
        page: number,
        perPage: number
    ): string {
        const start = this.toToken(startDate);
        const end = this.toToken(endDate);

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
        startDate: Date | null,
        endDate: Date | null
    ): string {
        const start = this.toToken(startDate);
        const end = this.toToken(endDate);

        return this.helperStringService.fillPattern(
            this.workspaceSummaryKeyPattern,
            { workspaceId, start, end }
        );
    }

    buildWorkspaceInviteFunnelKey(
        workspaceId: string,
        startDate: Date,
        endDate: Date
    ): string {
        const start = this.toToken(startDate);
        const end = this.toToken(endDate);

        return this.helperStringService.fillPattern(
            this.workspaceInviteFunnelKeyPattern,
            { workspaceId, start, end }
        );
    }

    buildWorkspaceJoinOutcomesKey(
        workspaceId: string,
        startDate: Date,
        endDate: Date
    ): string {
        const start = this.toToken(startDate);
        const end = this.toToken(endDate);

        return this.helperStringService.fillPattern(
            this.workspaceJoinOutcomesKeyPattern,
            { workspaceId, start, end }
        );
    }

    buildWorkspaceMemberRolesKey(workspaceId: string): string {
        return this.helperStringService.fillPattern(
            this.workspaceMemberRolesKeyPattern,
            { workspaceId }
        );
    }
}
