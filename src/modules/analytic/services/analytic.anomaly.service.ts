import { CacheService } from '@common/cache/services/cache.service';
import { HelperDateService } from '@common/helper/services/helper.date.service';
import type { IPaginationQueryOffsetParams } from '@common/pagination/interfaces/pagination.interface';
import type { IResponsePaginationReturn } from '@common/response/interfaces/response.interface';
import { EnumAnalyticSnapshotSignal } from '@generated/prisma-client/client';
import { AnalyticCache } from '@modules/analytic/caches/analytic.cache';
import {
    AnalyticAnomalyFailedLoginSpikeSummaryCacheSchema,
    AnalyticAnomalyLoginSpikeIpSummaryCacheSchema,
    AnalyticCacheEmptyToken,
    AnalyticDeviceProliferationSnapshotDataSchema,
    AnalyticDeviceProliferationSnapshotMetaSchema,
    AnalyticImpossibleTravelSnapshotDataSchema,
    AnalyticImpossibleTravelSnapshotMetaSchema,
} from '@modules/analytic/constants/analytic.constant';
import { EnumAnalyticAnomalySignal } from '@modules/analytic/enums/analytic.enum';
import type {
    IAnalyticAnomalyDeviceProliferationSummary,
    IAnalyticAnomalyDeviceProliferationSummaryMetadata,
    IAnalyticAnomalyFailedLoginSpikeSummary,
    IAnalyticAnomalyImpossibleTravelSummary,
    IAnalyticAnomalyImpossibleTravelSummaryMetadata,
    IAnalyticAnomalyLoginSpikeIpSummary,
    IAnalyticDeviceProliferation,
    IAnalyticImpossibleTravel,
    IAnalyticLoginSpikeIp,
    IAnalyticNearLockout,
    IAnalyticSnapshotResult,
} from '@modules/analytic/interfaces/analytic.interface';
import { AnalyticAnomalyRepository } from '@modules/analytic/repositories/analytic.anomaly.repository';
import { AnalyticSnapshotService } from '@modules/analytic/services/analytic.snapshot.service';
import { AnalyticDateUtil } from '@modules/analytic/utils/analytic.date.util';
import { AnalyticFraudUtil } from '@modules/analytic/utils/analytic.fraud.util';
import {
    EnumFeatureFlagKey,
    EnumFeatureFlagMetadataKey,
} from '@modules/feature-flag/enums/feature-flag.enum';
import { FeatureFlagService } from '@modules/feature-flag/services/feature-flag.service';
import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class AnalyticAnomalyService {
    private readonly impossibleTravelMinDistanceKm: number;
    private readonly impossibleTravelMaxDeltaInMs: number;
    private readonly loginSpikeIpMinUniqueAccounts: number;
    private readonly loginSpikeIpWindowInMs: number;
    private readonly lookbackInMs: number;
    private readonly deviceProliferationZScoreThreshold: number;

    constructor(
        private readonly analyticCache: AnalyticCache,
        private readonly cacheService: CacheService,
        private readonly analyticDateUtil: AnalyticDateUtil,
        private readonly analyticFraudUtil: AnalyticFraudUtil,
        private readonly configService: ConfigService,
        private readonly helperDateService: HelperDateService,
        private readonly featureFlagService: FeatureFlagService,
        private readonly analyticSnapshotService: AnalyticSnapshotService,
        private readonly analyticAnomalyRepository: AnalyticAnomalyRepository
    ) {
        this.impossibleTravelMinDistanceKm = this.configService.get<number>(
            'analytic.anomaly.impossibleTravel.minDistanceKm'
        )!;
        this.impossibleTravelMaxDeltaInMs = this.configService.get<number>(
            'analytic.anomaly.impossibleTravel.maxDeltaInMs'
        )!;
        this.loginSpikeIpMinUniqueAccounts = this.configService.get<number>(
            'analytic.anomaly.loginSpikeIp.minUniqueAccounts'
        )!;
        this.loginSpikeIpWindowInMs = this.configService.get<number>(
            'analytic.anomaly.loginSpikeIp.windowInMs'
        )!;
        this.lookbackInMs = this.configService.get<number>(
            'analytic.anomaly.lookbackInMs'
        )!;
        this.deviceProliferationZScoreThreshold =
            this.configService.get<number>(
                'analytic.anomaly.deviceProliferation.zScoreThreshold'
            )!;
    }

    private async getNearLockoutMinAttempt(): Promise<number> {
        const passwordMaxAttempt =
            await this.featureFlagService.getMetadataNumber(
                EnumFeatureFlagKey.loginWithCredential,
                EnumFeatureFlagMetadataKey.passwordMaxAttempts
            );

        return this.analyticFraudUtil.nearLockoutThreshold(passwordMaxAttempt);
    }

    async computeImpossibleTravel(): Promise<
        IAnalyticSnapshotResult<
            IAnalyticImpossibleTravel,
            IAnalyticAnomalyImpossibleTravelSummaryMetadata
        >
    > {
        const range = this.analyticDateUtil.windowRange(this.lookbackInMs);
        const items = await this.analyticAnomalyRepository.findImpossibleTravel(
            range,
            {
                minDistanceKm: this.impossibleTravelMinDistanceKm,
                maxDeltaInMs: this.impossibleTravelMaxDeltaInMs,
            }
        );

        return {
            items,
            metadata: {
                minDistanceKm: this.impossibleTravelMinDistanceKm,
                maxDeltaInMs: this.impossibleTravelMaxDeltaInMs,
            },
            windowStart: range.startDate,
            windowEnd: range.endDate,
        };
    }

    async computeDeviceProliferation(): Promise<
        IAnalyticSnapshotResult<
            IAnalyticDeviceProliferation,
            IAnalyticAnomalyDeviceProliferationSummaryMetadata
        >
    > {
        const result =
            await this.analyticAnomalyRepository.findDeviceProliferation(
                this.deviceProliferationZScoreThreshold
            );

        return {
            items: result.rows.map(row => ({
                key: row.userId,
                value: row.deviceCount,
                occurredAt: null,
                data: row,
            })),
            metadata: {
                avg: result.avg,
                stdDev: result.stdDev,
                zScoreThreshold: this.deviceProliferationZScoreThreshold,
            },
            windowStart: null,
            windowEnd: null,
        };
    }

    async impossibleTravelSummary(): Promise<IAnalyticAnomalyImpossibleTravelSummary> {
        const { count, metadata, windowStart, windowEnd, computedAt } =
            await this.analyticSnapshotService.getSummary(
                EnumAnalyticSnapshotSignal.impossibleTravel,
                AnalyticImpossibleTravelSnapshotMetaSchema
            );

        return {
            count,
            windowStart,
            windowEnd,
            computedAt,
            metadata: metadata ?? {
                minDistanceKm: this.impossibleTravelMinDistanceKm,
                maxDeltaInMs: this.impossibleTravelMaxDeltaInMs,
            },
        };
    }

    async impossibleTravelList(
        params: IPaginationQueryOffsetParams
    ): Promise<IResponsePaginationReturn<IAnalyticImpossibleTravel>> {
        return this.analyticSnapshotService.getListOffset(
            EnumAnalyticSnapshotSignal.impossibleTravel,
            params,
            null,
            AnalyticImpossibleTravelSnapshotDataSchema
        );
    }

    async loginSpikeIpSummary(): Promise<IAnalyticAnomalyLoginSpikeIpSummary> {
        const key = this.analyticCache.buildAnomalySummaryKey(
            EnumAnalyticAnomalySignal.loginSpikeIp,
            String(this.loginSpikeIpWindowInMs)
        );

        return this.cacheService.readThrough(
            key,
            AnalyticAnomalyLoginSpikeIpSummaryCacheSchema,
            this.analyticCache.liveSummaryTtlInMs,
            async () => {
                const range = this.analyticDateUtil.windowRange(
                    this.loginSpikeIpWindowInMs
                );
                const count =
                    await this.analyticAnomalyRepository.countLoginSpikeIp(
                        range,
                        this.loginSpikeIpMinUniqueAccounts
                    );

                return {
                    count,
                    windowStart: range.startDate,
                    windowEnd: range.endDate,
                    computedAt: null,
                    metadata: {
                        minUniqueAccounts: this.loginSpikeIpMinUniqueAccounts,
                    },
                };
            }
        );
    }

    async loginSpikeIpList(
        params: IPaginationQueryOffsetParams
    ): Promise<IResponsePaginationReturn<IAnalyticLoginSpikeIp>> {
        const range = this.analyticDateUtil.windowRange(
            this.loginSpikeIpWindowInMs
        );

        return this.analyticAnomalyRepository.findLoginSpikeIpOffset(
            range,
            this.loginSpikeIpMinUniqueAccounts,
            params
        );
    }

    async failedLoginSpikeSummary(): Promise<IAnalyticAnomalyFailedLoginSpikeSummary> {
        const key = this.analyticCache.buildAnomalySummaryKey(
            EnumAnalyticAnomalySignal.failedLoginSpike,
            AnalyticCacheEmptyToken
        );

        return this.cacheService.readThrough(
            key,
            AnalyticAnomalyFailedLoginSpikeSummaryCacheSchema,
            this.analyticCache.anomalySummaryTtlInMs,
            async () => {
                const now = this.helperDateService.create();
                const nearLockoutMinAttempt =
                    await this.getNearLockoutMinAttempt();
                const count =
                    await this.analyticAnomalyRepository.countNearLockout(
                        nearLockoutMinAttempt,
                        now
                    );

                return {
                    count,
                    windowStart: null,
                    windowEnd: null,
                    computedAt: null,
                    metadata: { nearLockoutMinAttempt },
                };
            }
        );
    }

    async failedLoginSpikeList(
        params: IPaginationQueryOffsetParams
    ): Promise<IResponsePaginationReturn<IAnalyticNearLockout>> {
        const now = this.helperDateService.create();
        const nearLockoutMinAttempt = await this.getNearLockoutMinAttempt();

        return this.analyticAnomalyRepository.findNearLockoutOffset(
            nearLockoutMinAttempt,
            now,
            params
        );
    }

    async deviceProliferationSummary(): Promise<IAnalyticAnomalyDeviceProliferationSummary> {
        const { count, metadata, windowStart, windowEnd, computedAt } =
            await this.analyticSnapshotService.getSummary(
                EnumAnalyticSnapshotSignal.deviceProliferation,
                AnalyticDeviceProliferationSnapshotMetaSchema
            );

        return {
            count,
            windowStart,
            windowEnd,
            computedAt,
            metadata: metadata ?? {
                avg: 0,
                stdDev: 0,
                zScoreThreshold: this.deviceProliferationZScoreThreshold,
            },
        };
    }

    async deviceProliferationList(
        params: IPaginationQueryOffsetParams
    ): Promise<IResponsePaginationReturn<IAnalyticDeviceProliferation>> {
        return this.analyticSnapshotService.getListOffset(
            EnumAnalyticSnapshotSignal.deviceProliferation,
            params,
            null,
            AnalyticDeviceProliferationSnapshotDataSchema
        );
    }
}
