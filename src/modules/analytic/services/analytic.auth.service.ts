import { CacheService } from '@common/cache/services/cache.service';
import { HelperDateService } from '@common/helper/services/helper.date.service';
import { HelperNumberService } from '@common/helper/services/helper.number.service';
import {
    EnumActivityLogAction,
    EnumAnalyticSnapshotSignal,
    EnumPasswordHistoryType,
    EnumVerificationType,
} from '@generated/prisma-client/client';
import { AnalyticCache } from '@modules/analytic/caches/analytic.cache';
import {
    EnumAnalyticDashboardMetric,
    EnumAnalyticGroupKey,
} from '@modules/analytic/enums/analytic.enum';
import type {
    IAnalyticBucketsResult,
    IAnalyticBucketsSnapshotMeta,
    IAnalyticCountBucket,
    IAnalyticCounted,
    IAnalyticForgotPasswordConversion,
    IAnalyticLockoutMetrics,
    IAnalyticMetricCount,
    IAnalyticMfaAdoption,
    IAnalyticMfaAdoptionCount,
    IAnalyticMfaAdoptionRate,
    IAnalyticSnapshotBucketsResult,
    IAnalyticSnapshotResult,
    IAnalyticVerificationFunnel,
    IAnalyticVerificationFunnels,
    IAnalyticVerificationGroupCount,
} from '@modules/analytic/interfaces/analytic.interface';
import { AnalyticAuthRepository } from '@modules/analytic/repositories/analytic.auth.repository';
import { AnalyticSnapshotService } from '@modules/analytic/services/analytic.snapshot.service';
import { UserLoginAnalyticActions } from '@modules/user/constants/user.constant';
import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Duration } from 'luxon';
import { AnalyticBucketsSnapshotMetaSchema } from '@modules/analytic/dtos/analytic.buckets-snapshot-meta.dto';
import { AnalyticBucketsResultCacheSchema } from '@modules/analytic/dtos/analytic.buckets-result-cache.dto';
import { AnalyticForgotPasswordConversionCacheSchema } from '@modules/analytic/dtos/analytic.forgot-password-conversion-cache.dto';
import { AnalyticLockoutMetricsCacheSchema } from '@modules/analytic/dtos/analytic.lockout-metrics-cache.dto';
import { AnalyticMetricCountCacheSchema } from '@modules/analytic/dtos/analytic.metric-count-cache.dto';
import { AnalyticMfaAdoptionSnapshotMetaSchema } from '@modules/analytic/dtos/analytic.mfa-adoption-snapshot-meta.dto';
import { AnalyticVerificationFunnelsCacheSchema } from '@modules/analytic/dtos/analytic.verification-funnels-cache.dto';

@Injectable()
export class AnalyticAuthService {
    private readonly idleTimeoutInMs: number;

    constructor(
        private readonly configService: ConfigService,
        private readonly analyticCache: AnalyticCache,
        private readonly cacheService: CacheService,
        private readonly analyticSnapshotService: AnalyticSnapshotService,
        private readonly helperDateService: HelperDateService,
        private readonly helperNumberService: HelperNumberService,
        private readonly analyticAuthRepository: AnalyticAuthRepository
    ) {
        this.idleTimeoutInMs = this.configService.get<number>(
            'session.idleTimeoutInMs'
        )!;
    }

    private idleSince(now: Date): Date {
        return this.helperDateService.backward(
            now,
            Duration.fromMillis(this.idleTimeoutInMs)
        );
    }

    private toVerificationFunnel(
        rows: IAnalyticVerificationGroupCount[],
        type: EnumVerificationType
    ): IAnalyticVerificationFunnel {
        const ofType = rows.filter(row => row.type === type);
        const used = ofType
            .filter(row => row.isUsed)
            .reduce((sum, row) => sum + row.count, 0);
        const unused = ofType
            .filter(row => !row.isUsed)
            .reduce((sum, row) => sum + row.count, 0);
        const total = used + unused;
        const rate = this.helperNumberService.percent(used, total);

        return { used, unused, total, rate };
    }

    private async countByActions(
        metric: EnumAnalyticDashboardMetric,
        actions: EnumActivityLogAction[],
        startDate: Date,
        endDate: Date
    ): Promise<IAnalyticMetricCount> {
        const key = this.analyticCache.buildDashboardKey(
            metric,
            startDate,
            endDate
        );

        return this.cacheService.readThrough(
            key,
            AnalyticMetricCountCacheSchema,
            this.analyticCache.dashboardTtlInMs,
            () => this.loadCountByActions(actions, startDate, endDate)
        );
    }

    private async loadCountByActions(
        actions: EnumActivityLogAction[],
        startDate: Date,
        endDate: Date
    ): Promise<IAnalyticMetricCount> {
        const count = await this.analyticAuthRepository.countActivityByActions(
            actions,
            startDate,
            endDate
        );

        return { count };
    }

    private async countPasswordHistory(
        metric: EnumAnalyticDashboardMetric,
        type: EnumPasswordHistoryType,
        startDate: Date,
        endDate: Date
    ): Promise<IAnalyticMetricCount> {
        const key = this.analyticCache.buildDashboardKey(
            metric,
            startDate,
            endDate
        );

        return this.cacheService.readThrough(
            key,
            AnalyticMetricCountCacheSchema,
            this.analyticCache.dashboardTtlInMs,
            () => this.loadCountPasswordHistory(type, startDate, endDate)
        );
    }

    private async loadCountPasswordHistory(
        type: EnumPasswordHistoryType,
        startDate: Date,
        endDate: Date
    ): Promise<IAnalyticMetricCount> {
        const count =
            await this.analyticAuthRepository.countPasswordHistoryByType(
                type,
                startDate,
                endDate
            );

        return { count };
    }

    private mapAdoption(
        enabled: number,
        activeUserCount: number
    ): IAnalyticMfaAdoptionRate {
        const rate = this.helperNumberService.percent(enabled, activeUserCount);
        return { enabled, total: activeUserCount, rate };
    }

    private async loadAuthLoginMethod(
        startDate: Date | null,
        endDate: Date | null
    ): Promise<IAnalyticBucketsResult> {
        const rows = await this.analyticAuthRepository.groupActivityByAction(
            UserLoginAnalyticActions,
            startDate,
            endDate
        );

        const buckets = this.toBuckets(rows, 'action');

        return { buckets };
    }

    private toBuckets<T extends IAnalyticCounted>(
        rows: T[],
        keyField: keyof T
    ): IAnalyticCountBucket[] {
        return rows.map(row => ({
            key: String(row[keyField]),
            count: row.count,
        }));
    }

    private async loadAuthLockout(
        startDate: Date,
        endDate: Date
    ): Promise<IAnalyticLockoutMetrics> {
        const rows = await this.analyticAuthRepository.groupActivityByAction(
            [
                EnumActivityLogAction.userLoginFailed,
                EnumActivityLogAction.userMaxPasswordAttemptReached,
                EnumActivityLogAction.userMaxMfaAttemptReached,
            ],
            startDate,
            endDate
        );
        const countByAction = new Map(rows.map(row => [row.action, row.count]));
        const countOf = (action: EnumActivityLogAction): number =>
            countByAction.get(action) ?? 0;

        return {
            failed: countOf(EnumActivityLogAction.userLoginFailed),
            maxAttempt:
                countOf(EnumActivityLogAction.userMaxPasswordAttemptReached) +
                countOf(EnumActivityLogAction.userMaxMfaAttemptReached),
        };
    }

    private async loadAuthSessionsGeo(
        startDate: Date,
        endDate: Date
    ): Promise<IAnalyticBucketsResult> {
        const now = this.helperDateService.now();
        const idleSince = this.idleSince(now);
        const rows = await this.analyticAuthRepository.groupSessionsGeo(
            startDate,
            endDate,
            now,
            idleSince
        );

        return {
            buckets: rows.map(({ key: group, count }) => ({
                key: group ?? EnumAnalyticGroupKey.unknown,
                count,
            })),
        };
    }

    private async loadAuthSessionsUserAgent(
        startDate: Date,
        endDate: Date
    ): Promise<IAnalyticBucketsResult> {
        const now = this.helperDateService.now();
        const idleSince = this.idleSince(now);
        const rows = await this.analyticAuthRepository.groupSessionsUserAgent(
            startDate,
            endDate,
            now,
            idleSince
        );

        return {
            buckets: rows.map(({ key: group, count }) => ({
                key: group ?? EnumAnalyticGroupKey.unknown,
                count,
            })),
        };
    }

    private async loadAuthVerificationFunnel(
        startDate: Date,
        endDate: Date
    ): Promise<IAnalyticVerificationFunnels> {
        const rows = await this.analyticAuthRepository.groupVerificationFunnel(
            startDate,
            endDate
        );

        const email = this.toVerificationFunnel(
            rows,
            EnumVerificationType.email
        );
        const mobile = this.toVerificationFunnel(
            rows,
            EnumVerificationType.mobileNumber
        );

        return { email, mobile };
    }

    private async loadAuthForgotPasswordConversion(
        startDate: Date,
        endDate: Date
    ): Promise<IAnalyticForgotPasswordConversion> {
        const rows =
            await this.analyticAuthRepository.groupForgotPasswordConversion(
                startDate,
                endDate
            );
        const created = rows.reduce((sum, row) => sum + row.count, 0);
        const used = rows
            .filter(row => row.isUsed)
            .reduce((sum, row) => sum + row.count, 0);
        const rate = this.helperNumberService.percent(used, created);

        return { created, used, rate };
    }

    async getAuthLoginFrequency(
        startDate: Date,
        endDate: Date
    ): Promise<IAnalyticMetricCount> {
        return this.countByActions(
            EnumAnalyticDashboardMetric.authLoginFrequency,
            UserLoginAnalyticActions,
            startDate,
            endDate
        );
    }

    async getAuthLoginMethod(
        startDate: Date | null,
        endDate: Date | null
    ): Promise<IAnalyticBucketsResult> {
        const key = this.analyticCache.buildDashboardKey(
            EnumAnalyticDashboardMetric.authLoginMethod,
            startDate,
            endDate
        );

        return this.cacheService.readThrough(
            key,
            AnalyticBucketsResultCacheSchema,
            this.analyticCache.dashboardTtlInMs,
            () => this.loadAuthLoginMethod(startDate, endDate)
        );
    }

    async getAuthLockout(
        startDate: Date,
        endDate: Date
    ): Promise<IAnalyticLockoutMetrics> {
        const key = this.analyticCache.buildDashboardKey(
            EnumAnalyticDashboardMetric.authLockout,
            startDate,
            endDate
        );

        return this.cacheService.readThrough(
            key,
            AnalyticLockoutMetricsCacheSchema,
            this.analyticCache.dashboardTtlInMs,
            () => this.loadAuthLockout(startDate, endDate)
        );
    }

    async computeConcurrentSessions(): Promise<
        IAnalyticSnapshotResult<never, IAnalyticBucketsSnapshotMeta>
    > {
        const now = this.helperDateService.now();
        const idleSince = this.idleSince(now);
        const buckets =
            await this.analyticAuthRepository.findConcurrentSessions(
                now,
                idleSince
            );

        return {
            items: [],
            metadata: { buckets },
            windowStart: null,
            windowEnd: null,
        };
    }

    async getAuthConcurrentSessions(): Promise<IAnalyticSnapshotBucketsResult> {
        const { metadata, computedAt } =
            await this.analyticSnapshotService.getSummary(
                EnumAnalyticSnapshotSignal.concurrentSessions,
                AnalyticBucketsSnapshotMetaSchema
            );

        return { buckets: metadata?.buckets ?? [], computedAt };
    }

    async getAuthSessionsGeo(
        startDate: Date,
        endDate: Date
    ): Promise<IAnalyticBucketsResult> {
        const key = this.analyticCache.buildDashboardKey(
            EnumAnalyticDashboardMetric.authSessionsGeo,
            startDate,
            endDate
        );

        return this.cacheService.readThrough(
            key,
            AnalyticBucketsResultCacheSchema,
            this.analyticCache.dashboardTtlInMs,
            () => this.loadAuthSessionsGeo(startDate, endDate)
        );
    }

    async getAuthSessionsUserAgent(
        startDate: Date,
        endDate: Date
    ): Promise<IAnalyticBucketsResult> {
        const key = this.analyticCache.buildDashboardKey(
            EnumAnalyticDashboardMetric.authSessionsUserAgent,
            startDate,
            endDate
        );

        return this.cacheService.readThrough(
            key,
            AnalyticBucketsResultCacheSchema,
            this.analyticCache.dashboardTtlInMs,
            () => this.loadAuthSessionsUserAgent(startDate, endDate)
        );
    }

    async getAuthVerificationFunnel(
        startDate: Date,
        endDate: Date
    ): Promise<IAnalyticVerificationFunnels> {
        const key = this.analyticCache.buildDashboardKey(
            EnumAnalyticDashboardMetric.authVerificationFunnel,
            startDate,
            endDate
        );

        return this.cacheService.readThrough(
            key,
            AnalyticVerificationFunnelsCacheSchema,
            this.analyticCache.dashboardTtlInMs,
            () => this.loadAuthVerificationFunnel(startDate, endDate)
        );
    }

    async getAuthPasswordChange(
        startDate: Date,
        endDate: Date
    ): Promise<IAnalyticMetricCount> {
        return this.countPasswordHistory(
            EnumAnalyticDashboardMetric.authPasswordChange,
            EnumPasswordHistoryType.profile,
            startDate,
            endDate
        );
    }

    async getAuthForgotPasswordConversion(
        startDate: Date,
        endDate: Date
    ): Promise<IAnalyticForgotPasswordConversion> {
        const key = this.analyticCache.buildDashboardKey(
            EnumAnalyticDashboardMetric.authForgotPasswordConversion,
            startDate,
            endDate
        );

        return this.cacheService.readThrough(
            key,
            AnalyticForgotPasswordConversionCacheSchema,
            this.analyticCache.dashboardTtlInMs,
            () => this.loadAuthForgotPasswordConversion(startDate, endDate)
        );
    }

    async computeMfaAdoption(): Promise<
        IAnalyticSnapshotResult<never, IAnalyticMfaAdoptionCount>
    > {
        const { enabled, total } =
            await this.analyticAuthRepository.findMfaAdoption();

        return {
            items: [],
            metadata: { enabled, total },
            windowStart: null,
            windowEnd: null,
        };
    }

    async getAuthMfaAdoption(): Promise<IAnalyticMfaAdoption> {
        const { metadata, computedAt } =
            await this.analyticSnapshotService.getSummary(
                EnumAnalyticSnapshotSignal.mfaAdoption,
                AnalyticMfaAdoptionSnapshotMetaSchema
            );

        const adoption = this.mapAdoption(
            metadata?.enabled ?? 0,
            metadata?.total ?? 0
        );

        return {
            ...adoption,
            computedAt,
        };
    }
}
