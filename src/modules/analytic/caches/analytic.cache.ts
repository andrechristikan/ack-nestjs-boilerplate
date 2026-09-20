import { CacheMainProvider } from '@common/cache/constants/cache.constant';
import { HelperStringService } from '@common/helper/services/helper.string.service';
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

    private buildKey(pattern: string, tokens: Record<string, string>): string {
        return this.helperStringService.fillPattern(pattern, tokens);
    }

    private async get<T>(cacheKey: string): Promise<T | null> {
        try {
            const cached = await this.cacheManager.get<T>(cacheKey);
            return cached ?? null;
        } catch (error: unknown) {
            this.logger.error(error, 'Analytic cache read failed');
            return null;
        }
    }

    private async set<T>(
        cacheKey: string,
        value: T,
        ttl: number
    ): Promise<void> {
        try {
            await this.cacheManager.set(cacheKey, value, ttl);
        } catch (error: unknown) {
            this.logger.error(error, 'Analytic cache write failed');
        }
    }

    async getDashboard<T>(
        metric: string,
        start: string,
        end: string
    ): Promise<T | null> {
        const key = this.buildKey(this.dashboardKeyPattern, {
            metric,
            start,
            end,
        });

        return this.get<T>(key);
    }

    async setDashboard<T>(
        metric: string,
        start: string,
        end: string,
        value: T
    ): Promise<void> {
        const key = this.buildKey(this.dashboardKeyPattern, {
            metric,
            start,
            end,
        });
        await this.set(key, value, this.dashboardTtlInMs);
    }

    async getAnomalySummary<T>(
        signal: string,
        window: string
    ): Promise<T | null> {
        const key = this.buildKey(this.anomalyKeyPattern, { signal, window });

        return this.get<T>(key);
    }

    async setAnomalySummary<T>(
        signal: string,
        window: string,
        value: T
    ): Promise<void> {
        const key = this.buildKey(this.anomalyKeyPattern, { signal, window });
        await this.set(key, value, this.anomalySummaryTtlInMs);
    }

    async getFraudSummary<T>(
        signal: string,
        window: string
    ): Promise<T | null> {
        const key = this.buildKey(this.fraudKeyPattern, { signal, window });

        return this.get<T>(key);
    }

    async setFraudSummary<T>(
        signal: string,
        window: string,
        value: T
    ): Promise<void> {
        const key = this.buildKey(this.fraudKeyPattern, { signal, window });
        await this.set(key, value, this.fraudSummaryTtlInMs);
    }

    async getRiskScore<T>(userId: string): Promise<T | null> {
        const key = this.buildKey(this.riskScoreKeyPattern, { userId });

        return this.get<T>(key);
    }

    async setRiskScore<T>(userId: string, value: T): Promise<void> {
        const key = this.buildKey(this.riskScoreKeyPattern, { userId });
        await this.set(key, value, this.riskScoreTtlInMs);
    }
}
