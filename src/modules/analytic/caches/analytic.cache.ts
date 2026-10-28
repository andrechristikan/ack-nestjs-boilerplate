import { CacheMainProvider } from '@common/cache/constants/cache.constant';
import { HelperStringService } from '@common/helper/services/helper.string.service';
import type {
    EnumAnalyticAnomalySignal,
    EnumAnalyticFraudSignal,
} from '@modules/analytic/enums/analytic.enum';
import { Inject, Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { Cache } from 'cache-manager';

@Injectable()
export class AnalyticCache {
    private readonly logger = new Logger(AnalyticCache.name);
    private readonly dashboardKeyPattern: string;
    private readonly anomalyKeyPattern: string;
    private readonly fraudKeyPattern: string;
    private readonly riskScoreKeyPattern: string;
    private readonly dashboardTtlInMs: number;
    private readonly anomalySummaryTtlInMs: number;
    private readonly fraudSummaryTtlInMs: number;
    private readonly riskScoreTtlInMs: number;

    constructor(
        @Inject(CacheMainProvider) private readonly cacheManager: Cache,
        private readonly configService: ConfigService,
        private readonly helperStringService: HelperStringService
    ) {
        this.dashboardKeyPattern = this.configService.get<string>(
            'analytic.cache.keyPatterns.dashboard'
        )!;
        this.anomalyKeyPattern = this.configService.get<string>(
            'analytic.cache.keyPatterns.anomaly'
        )!;
        this.fraudKeyPattern = this.configService.get<string>(
            'analytic.cache.keyPatterns.fraud'
        )!;
        this.riskScoreKeyPattern = this.configService.get<string>(
            'analytic.cache.keyPatterns.riskScore'
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

    private buildDashboardKey(
        metric: string,
        start: string,
        end: string
    ): string {
        return this.helperStringService.fillPattern(this.dashboardKeyPattern, {
            metric,
            start,
            end,
        });
    }

    private buildAnomalySummaryKey(
        signal: EnumAnalyticAnomalySignal,
        window: string
    ): string {
        return this.helperStringService.fillPattern(this.anomalyKeyPattern, {
            signal,
            window,
        });
    }

    private buildFraudSummaryKey(
        signal: EnumAnalyticFraudSignal,
        window: string
    ): string {
        return this.helperStringService.fillPattern(this.fraudKeyPattern, {
            signal,
            window,
        });
    }

    private buildRiskScoreKey(userId: string): string {
        return this.helperStringService.fillPattern(this.riskScoreKeyPattern, {
            userId,
        });
    }

    async getDashboard<T>(
        metric: string,
        start: string,
        end: string
    ): Promise<T | null> {
        const key = this.buildDashboardKey(metric, start, end);
        try {
            const cached = await this.cacheManager.get<T>(key);

            return cached ?? null;
        } catch (error: unknown) {
            this.logger.error(error, 'Analytic dashboard cache read failed');

            return null;
        }
    }

    async setDashboard<T>(
        metric: string,
        start: string,
        end: string,
        value: T
    ): Promise<void> {
        const key = this.buildDashboardKey(metric, start, end);
        try {
            await this.cacheManager.set(key, value, this.dashboardTtlInMs);
        } catch (error: unknown) {
            this.logger.error(error, 'Analytic dashboard cache write failed');
        }
    }

    async getAnomalySummary<T>(
        signal: EnumAnalyticAnomalySignal,
        window: string
    ): Promise<T | null> {
        const key = this.buildAnomalySummaryKey(signal, window);
        try {
            const cached = await this.cacheManager.get<T>(key);

            return cached ?? null;
        } catch (error: unknown) {
            this.logger.error(error, 'Analytic anomaly cache read failed');

            return null;
        }
    }

    async setAnomalySummary<T>(
        signal: EnumAnalyticAnomalySignal,
        window: string,
        value: T
    ): Promise<void> {
        const key = this.buildAnomalySummaryKey(signal, window);
        try {
            await this.cacheManager.set(key, value, this.anomalySummaryTtlInMs);
        } catch (error: unknown) {
            this.logger.error(error, 'Analytic anomaly cache write failed');
        }
    }

    async getFraudSummary<T>(
        signal: EnumAnalyticFraudSignal,
        window: string
    ): Promise<T | null> {
        const key = this.buildFraudSummaryKey(signal, window);
        try {
            const cached = await this.cacheManager.get<T>(key);

            return cached ?? null;
        } catch (error: unknown) {
            this.logger.error(error, 'Analytic fraud cache read failed');

            return null;
        }
    }

    async setFraudSummary<T>(
        signal: EnumAnalyticFraudSignal,
        window: string,
        value: T
    ): Promise<void> {
        const key = this.buildFraudSummaryKey(signal, window);
        try {
            await this.cacheManager.set(key, value, this.fraudSummaryTtlInMs);
        } catch (error: unknown) {
            this.logger.error(error, 'Analytic fraud cache write failed');
        }
    }

    async getRiskScore<T>(userId: string): Promise<T | null> {
        const key = this.buildRiskScoreKey(userId);
        try {
            const cached = await this.cacheManager.get<T>(key);

            return cached ?? null;
        } catch (error: unknown) {
            this.logger.error(error, 'Analytic risk score cache read failed');

            return null;
        }
    }

    async setRiskScore<T>(userId: string, value: T): Promise<void> {
        const key = this.buildRiskScoreKey(userId);
        try {
            await this.cacheManager.set(key, value, this.riskScoreTtlInMs);
        } catch (error: unknown) {
            this.logger.error(error, 'Analytic risk score cache write failed');
        }
    }
}
