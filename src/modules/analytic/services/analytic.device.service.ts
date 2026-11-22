import { CacheService } from '@common/cache/services/cache.service';
import { HelperDateService } from '@common/helper/services/helper.date.service';
import { HelperNumberService } from '@common/helper/services/helper.number.service';
import { EnumAnalyticSnapshotSignal } from '@generated/prisma-client/client';
import { AnalyticCache } from '@modules/analytic/caches/analytic.cache';
import { EnumAnalyticDashboardMetric } from '@modules/analytic/enums/analytic.enum';
import type {
    IAnalyticBucketsResult,
    IAnalyticCountBucket,
    IAnalyticMetricCount,
    IAnalyticMetricRate,
    IAnalyticSnapshotBucketsResult,
    IAnalyticSnapshotResult,
} from '@modules/analytic/interfaces/analytic.interface';
import { AnalyticDeviceRepository } from '@modules/analytic/repositories/analytic.device.repository';
import { AnalyticSnapshotService } from '@modules/analytic/services/analytic.snapshot.service';
import { AnalyticBucketUtil } from '@modules/analytic/utils/analytic.bucket.util';
import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Duration } from 'luxon';
import { AnalyticBucketsResultCacheSchema } from '@modules/analytic/dtos/analytic.buckets-result-cache.dto';
import { AnalyticDevicePerUserSnapshotDataSchema } from '@modules/analytic/dtos/analytic.device-per-user-snapshot-data.dto';
import { AnalyticMetricCountCacheSchema } from '@modules/analytic/dtos/analytic.metric-count-cache.dto';
import { AnalyticMetricRateCacheSchema } from '@modules/analytic/dtos/analytic.metric-rate-cache.dto';

@Injectable()
export class AnalyticDeviceService {
    private readonly inactivityInMs: number;

    constructor(
        private readonly configService: ConfigService,
        private readonly analyticCache: AnalyticCache,
        private readonly cacheService: CacheService,
        private readonly analyticBucketUtil: AnalyticBucketUtil,
        private readonly analyticSnapshotService: AnalyticSnapshotService,
        private readonly helperDateService: HelperDateService,
        private readonly helperNumberService: HelperNumberService,
        private readonly analyticDeviceRepository: AnalyticDeviceRepository
    ) {
        this.inactivityInMs = this.configService.get<number>(
            'analytic.device.inactivityInMs'
        )!;
    }

    private async loadDevicePlatform(): Promise<IAnalyticBucketsResult> {
        const buckets = await this.analyticDeviceRepository.groupPlatform();

        return { buckets };
    }

    private async loadDevicePushToken(): Promise<IAnalyticMetricRate> {
        const { total, withToken } =
            await this.analyticDeviceRepository.countPushToken();
        const rate = this.helperNumberService.percent(withToken, total);

        return { count: withToken, total, rate };
    }

    private async loadDeviceInactivity(): Promise<IAnalyticMetricCount> {
        const now = this.helperDateService.create();
        const before = this.helperDateService.backward(
            now,
            Duration.fromMillis(this.inactivityInMs)
        );
        const count = await this.analyticDeviceRepository.countInactive(before);

        return { count };
    }

    async getDevicePlatform(): Promise<IAnalyticBucketsResult> {
        const key = this.analyticCache.buildDashboardKey(
            EnumAnalyticDashboardMetric.devicePlatform,
            null,
            null
        );

        return this.cacheService.readThrough(
            key,
            AnalyticBucketsResultCacheSchema,
            this.analyticCache.dashboardTtlInMs,
            () => this.loadDevicePlatform()
        );
    }

    async getDevicePushToken(): Promise<IAnalyticMetricRate> {
        const key = this.analyticCache.buildDashboardKey(
            EnumAnalyticDashboardMetric.devicePushToken,
            null,
            null
        );

        return this.cacheService.readThrough(
            key,
            AnalyticMetricRateCacheSchema,
            this.analyticCache.dashboardTtlInMs,
            () => this.loadDevicePushToken()
        );
    }

    async computeDevicePerUser(): Promise<
        IAnalyticSnapshotResult<IAnalyticCountBucket, null>
    > {
        const buckets = await this.analyticDeviceRepository.groupPerUser();

        return this.analyticBucketUtil.toBucketSnapshot(buckets);
    }

    async getDevicePerUser(): Promise<IAnalyticSnapshotBucketsResult> {
        return this.analyticSnapshotService.getBuckets(
            EnumAnalyticSnapshotSignal.devicesPerUser,
            AnalyticDevicePerUserSnapshotDataSchema
        );
    }

    async getDeviceInactivity(): Promise<IAnalyticMetricCount> {
        const key = this.analyticCache.buildDashboardKey(
            EnumAnalyticDashboardMetric.deviceInactivity,
            null,
            null
        );

        return this.cacheService.readThrough(
            key,
            AnalyticMetricCountCacheSchema,
            this.analyticCache.dashboardTtlInMs,
            () => this.loadDeviceInactivity()
        );
    }
}
