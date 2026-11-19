import { CacheService } from '@common/cache/services/cache.service';
import { HelperDateService } from '@common/helper/services/helper.date.service';
import { HelperNumberService } from '@common/helper/services/helper.number.service';
import { EnumAnalyticSnapshotSignal } from '@generated/prisma-client/client';
import { AnalyticCache } from '@modules/analytic/caches/analytic.cache';
import {
    AnalyticBucketsResultCacheSchema,
    AnalyticDevicesPerUserSnapshotDataSchema,
    AnalyticMetricCountCacheSchema,
    AnalyticMetricRateCacheSchema,
    AnalyticSessionDeviceRatioCacheSchema,
} from '@modules/analytic/constants/analytic.constant';
import { EnumAnalyticDashboardMetric } from '@modules/analytic/enums/analytic.enum';
import type {
    IAnalyticBucketsResult,
    IAnalyticCountBucket,
    IAnalyticMetricCount,
    IAnalyticMetricRate,
    IAnalyticSessionDeviceRatio,
    IAnalyticSnapshotBucketsResult,
    IAnalyticSnapshotResult,
} from '@modules/analytic/interfaces/analytic.interface';
import { AnalyticDeviceRepository } from '@modules/analytic/repositories/analytic.device.repository';
import { AnalyticSnapshotService } from '@modules/analytic/services/analytic.snapshot.service';
import { AnalyticBucketUtil } from '@modules/analytic/utils/analytic.bucket.util';
import { AnalyticDateUtil } from '@modules/analytic/utils/analytic.date.util';
import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Duration } from 'luxon';

@Injectable()
export class AnalyticDeviceService {
    private readonly inactivityInMs: number;
    private readonly idleTimeoutInMs: number;

    constructor(
        private readonly configService: ConfigService,
        private readonly analyticCache: AnalyticCache,
        private readonly cacheService: CacheService,
        private readonly analyticDateUtil: AnalyticDateUtil,
        private readonly analyticBucketUtil: AnalyticBucketUtil,
        private readonly analyticSnapshotService: AnalyticSnapshotService,
        private readonly helperDateService: HelperDateService,
        private readonly helperNumberService: HelperNumberService,
        private readonly analyticDeviceRepository: AnalyticDeviceRepository
    ) {
        this.inactivityInMs = this.configService.get<number>(
            'analytic.device.inactivityInMs'
        )!;
        this.idleTimeoutInMs = this.configService.get<number>(
            'session.idleTimeoutInMs'
        )!;
    }

    private dashboardKey(
        metric: EnumAnalyticDashboardMetric,
        startDate: Date | null,
        endDate: Date | null
    ): string {
        const start = this.analyticDateUtil.cacheToken(startDate);
        const end = this.analyticDateUtil.cacheToken(endDate);

        return this.analyticCache.buildDashboardKey(metric, start, end);
    }

    async devicesRegistration(
        startDate: Date,
        endDate: Date
    ): Promise<IAnalyticMetricCount> {
        const key = this.dashboardKey(
            EnumAnalyticDashboardMetric.devicesRegistration,
            startDate,
            endDate
        );

        return this.cacheService.readThrough(
            key,
            AnalyticMetricCountCacheSchema,
            this.analyticCache.dashboardTtlInMs,
            async () => {
                const count =
                    await this.analyticDeviceRepository.countRegistrations(
                        startDate,
                        endDate
                    );

                return { count };
            }
        );
    }

    async devicesPlatform(): Promise<IAnalyticBucketsResult> {
        const key = this.dashboardKey(
            EnumAnalyticDashboardMetric.devicesPlatform,
            null,
            null
        );

        return this.cacheService.readThrough(
            key,
            AnalyticBucketsResultCacheSchema,
            this.analyticCache.dashboardTtlInMs,
            async () => {
                const buckets =
                    await this.analyticDeviceRepository.groupPlatform();

                return { buckets };
            }
        );
    }

    async devicesPushToken(): Promise<IAnalyticMetricRate> {
        const key = this.dashboardKey(
            EnumAnalyticDashboardMetric.devicesPushToken,
            null,
            null
        );

        return this.cacheService.readThrough(
            key,
            AnalyticMetricRateCacheSchema,
            this.analyticCache.dashboardTtlInMs,
            async () => {
                const { total, withToken } =
                    await this.analyticDeviceRepository.countPushToken();
                const rate = this.helperNumberService.percent(withToken, total);

                return { count: withToken, total, rate };
            }
        );
    }

    async devicesInfoRefresh(
        startDate: Date,
        endDate: Date
    ): Promise<IAnalyticMetricCount> {
        const key = this.dashboardKey(
            EnumAnalyticDashboardMetric.devicesInfoRefresh,
            startDate,
            endDate
        );

        return this.cacheService.readThrough(
            key,
            AnalyticMetricCountCacheSchema,
            this.analyticCache.dashboardTtlInMs,
            async () => {
                const count =
                    await this.analyticDeviceRepository.countInfoRefresh(
                        startDate,
                        endDate
                    );

                return { count };
            }
        );
    }

    async devicesSessionRatio(): Promise<IAnalyticSessionDeviceRatio> {
        const key = this.dashboardKey(
            EnumAnalyticDashboardMetric.devicesSessionRatio,
            null,
            null
        );

        return this.cacheService.readThrough(
            key,
            AnalyticSessionDeviceRatioCacheSchema,
            this.analyticCache.dashboardTtlInMs,
            async () => {
                const now = this.helperDateService.create();
                const idleSince = this.helperDateService.backward(
                    now,
                    Duration.fromMillis(this.idleTimeoutInMs)
                );
                const { sessions, devices } =
                    await this.analyticDeviceRepository.findSessionRatioCounts(
                        now,
                        idleSince
                    );

                return {
                    sessions,
                    devices,
                    ratio: devices === 0 ? 0 : sessions / devices,
                };
            }
        );
    }

    async computeDevicesPerUser(): Promise<
        IAnalyticSnapshotResult<IAnalyticCountBucket, null>
    > {
        const buckets = await this.analyticDeviceRepository.groupPerUser();

        return this.analyticBucketUtil.toBucketSnapshot(buckets);
    }

    async devicesPerUser(): Promise<IAnalyticSnapshotBucketsResult> {
        return this.analyticSnapshotService.getBuckets(
            EnumAnalyticSnapshotSignal.devicesPerUser,
            AnalyticDevicesPerUserSnapshotDataSchema
        );
    }

    async devicesInactivity(): Promise<IAnalyticMetricCount> {
        const key = this.dashboardKey(
            EnumAnalyticDashboardMetric.devicesInactivity,
            null,
            null
        );

        return this.cacheService.readThrough(
            key,
            AnalyticMetricCountCacheSchema,
            this.analyticCache.dashboardTtlInMs,
            async () => {
                const now = this.helperDateService.create();
                const before = this.helperDateService.backward(
                    now,
                    Duration.fromMillis(this.inactivityInMs)
                );
                const count =
                    await this.analyticDeviceRepository.countInactive(before);

                return { count };
            }
        );
    }
}
