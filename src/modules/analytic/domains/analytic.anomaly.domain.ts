import { HelperDateService } from '@common/helper/services/helper.date.service';
import type { IPaginationQueryOffsetParams } from '@common/pagination/interfaces/pagination.interface';
import { PaginationService } from '@common/pagination/services/pagination.service';
import type { IResponsePaginationReturn } from '@common/response/interfaces/response.interface';
import { AnalyticCache } from '@modules/analytic/caches/analytic.cache';
import {
    AnalyticDeviceProliferationAvailableOrderBy,
    AnalyticImpossibleTravelAvailableOrderBy,
    AnalyticLoginSpikeIpAvailableOrderBy,
    AnalyticLoginTimeAnomalyAvailableOrderBy,
} from '@modules/analytic/constants/analytic.list.constant';
import type {
    IAnalyticAnomalySummary,
    IAnalyticDeviceProliferation,
    IAnalyticImpossibleTravel,
    IAnalyticLoginSpikeIp,
    IAnalyticLoginTimeAnomaly,
    IAnalyticNearLockout,
} from '@modules/analytic/interfaces/analytic.interface';
import { AnalyticDateUtil } from '@modules/analytic/utils/analytic.date.util';
import { AnalyticGeoUtil } from '@modules/analytic/utils/analytic.geo.util';
import { AnalyticSortUtil } from '@modules/analytic/utils/analytic.sort.util';
import { DeviceAnalyticDomain } from '@modules/device/domains/device.analytic.domain';
import { SessionAnalyticDomain } from '@modules/session/domains/session.analytic.domain';
import { UserAnalyticDomain } from '@modules/user/domains/user.analytic.domain';
import { UserLoginAnalyticDomain } from '@modules/user/domains/user.login.analytic.domain';
import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Prisma } from '@generated/prisma-client/client';
import { Duration } from 'luxon';

@Injectable()
export class AnalyticAnomalyDomain {
    constructor(
        private readonly analyticCache: AnalyticCache,
        private readonly analyticDateUtil: AnalyticDateUtil,
        private readonly analyticGeoUtil: AnalyticGeoUtil,
        private readonly analyticSortUtil: AnalyticSortUtil,
        private readonly paginationService: PaginationService,
        private readonly configService: ConfigService,
        private readonly helperDateService: HelperDateService,
        private readonly sessionAnalyticDomain: SessionAnalyticDomain,
        private readonly userAnalyticDomain: UserAnalyticDomain,
        private readonly userLoginAnalyticDomain: UserLoginAnalyticDomain,
        private readonly deviceAnalyticDomain: DeviceAnalyticDomain
    ) {}

    private windowToken(
        start: Date | null,
        end: Date | null,
        windowMs: number | null
    ): string {
        if (windowMs) {
            return String(windowMs);
        }
        return this.analyticDateUtil.windowToken(
            start ?? undefined,
            end ?? undefined
        );
    }

    private async computeImpossibleTravel(
        startDate: Date | null,
        endDate: Date | null
    ): Promise<IAnalyticImpossibleTravel[]> {
        const sessions =
            await this.sessionAnalyticDomain.findActiveWithGeoInRange(
                startDate ?? undefined,
                endDate ?? undefined
            );
        const minDistanceKm = this.configService.get<number>(
            'analytic.anomaly.impossibleTravel.minDistanceKm'
        )!;
        const maxDeltaInMs = this.configService.get<number>(
            'analytic.anomaly.impossibleTravel.maxDeltaInMs'
        )!;
        const byUser = new Map<string, typeof sessions>();
        for (const s of sessions) {
            if (!byUser.has(s.userId)) {
                byUser.set(s.userId, []);
            }
            byUser.get(s.userId)!.push(s);
        }
        const flagged: IAnalyticImpossibleTravel[] = [];
        for (const [userId, list] of byUser) {
            for (let i = 1; i < list.length; i++) {
                const prev = list[i - 1];
                const curr = list[i];
                if (!prev.geoLocation || !curr.geoLocation) {
                    continue;
                }
                const distanceKm = this.analyticGeoUtil.distanceKm(
                    prev.geoLocation.latitude,
                    prev.geoLocation.longitude,
                    curr.geoLocation.latitude,
                    curr.geoLocation.longitude
                );
                const deltaMs =
                    curr.createdAt.getTime() - prev.createdAt.getTime();
                if (distanceKm > minDistanceKm && deltaMs < maxDeltaInMs) {
                    flagged.push({
                        userId,
                        fromSessionId: prev.id,
                        toSessionId: curr.id,
                        distanceKm,
                        deltaMs,
                    });
                }
            }
        }
        return flagged;
    }

    private async computeLoginSpikeIp(
        windowMs: number
    ): Promise<IAnalyticLoginSpikeIp[]> {
        const end = this.helperDateService.create();
        const start = this.helperDateService.backward(
            end,
            Duration.fromMillis(windowMs)
        );
        const events = await this.userLoginAnalyticDomain.findLoginEvents(
            start,
            end
        );
        const minUnique = this.configService.get<number>(
            'analytic.anomaly.loginSpikeIp.minUniqueAccounts'
        )!;
        const map = new Map<string, Set<string>>();
        const attempts = new Map<string, number>();
        for (const e of events) {
            const ip = e.ipAddress ?? 'unknown';
            if (!map.has(ip)) {
                map.set(ip, new Set());
            }
            map.get(ip)!.add(e.userId);
            attempts.set(ip, (attempts.get(ip) ?? 0) + 1);
        }
        return [...map.entries()]
            .filter(([, users]) => users.size >= minUnique)
            .map(([ipAddress, users]) => ({
                ipAddress,
                uniqueUsers: users.size,
                attempts: attempts.get(ipAddress)!,
            }))
            .sort((a, b) => b.uniqueUsers - a.uniqueUsers);
    }

    private async computeLoginTimeAnomalies(
        startDate: Date | null,
        endDate: Date | null
    ): Promise<IAnalyticLoginTimeAnomaly[]> {
        const now = this.helperDateService.create();
        const end = endDate ?? now;
        const defaultStart = this.helperDateService.backward(
            end,
            Duration.fromObject({ days: 30 })
        );
        const start = startDate ?? defaultStart;
        const events = await this.userLoginAnalyticDomain.findLoginEvents(
            start,
            end
        );
        const thresholdPct = this.configService.get<number>(
            'analytic.anomaly.loginTimeAnomaly.historicalFrequencyPercent'
        )!;
        const byUser = new Map<string, number[]>();
        for (const e of events) {
            const hour = e.createdAt.getUTCHours();
            if (!byUser.has(e.userId)) {
                byUser.set(e.userId, []);
            }
            byUser.get(e.userId)!.push(hour);
        }
        const anomalous: IAnalyticLoginTimeAnomaly[] = [];
        for (const [userId, hours] of byUser) {
            if (hours.length < 5) {
                continue;
            }
            const hist = new Array(24).fill(0) as number[];
            for (const h of hours) {
                hist[h]++;
            }
            const lastHour = hours[hours.length - 1];
            const freq = (hist[lastHour] / hours.length) * 100;
            if (freq < thresholdPct) {
                anomalous.push({
                    userId,
                    lastHour,
                    historicalFrequencyPercent: freq,
                });
            }
        }
        return anomalous;
    }

    async impossibleTravelSummary(
        startDate: Date | null,
        endDate: Date | null
    ): Promise<IAnalyticAnomalySummary> {
        const window = this.windowToken(startDate, endDate, null);
        const cached =
            await this.analyticCache.getAnomalySummary<IAnalyticAnomalySummary>(
                'impossible-travel',
                window
            );
        if (cached) {
            return cached;
        }

        const rows = await this.computeImpossibleTravel(startDate, endDate);
        const minDistanceKm = this.configService.get<number>(
            'analytic.anomaly.impossibleTravel.minDistanceKm'
        )!;
        const maxDeltaInMs = this.configService.get<number>(
            'analytic.anomaly.impossibleTravel.maxDeltaInMs'
        )!;
        const summary: IAnalyticAnomalySummary = {
            count: rows.length,
            window,
            meta: { minDistanceKm, maxDeltaInMs },
        };
        await this.analyticCache.setAnomalySummary(
            'impossible-travel',
            window,
            summary
        );
        return summary;
    }

    async impossibleTravelList(
        startDate: Date | null,
        endDate: Date | null,
        params: IPaginationQueryOffsetParams<Prisma.SessionWhereInput>
    ): Promise<IResponsePaginationReturn<IAnalyticImpossibleTravel>> {
        const rows = await this.computeImpossibleTravel(startDate, endDate);
        const { skip, limit, orderBy } = params;
        const sorted = this.analyticSortUtil.sortRows(
            rows,
            orderBy,
            AnalyticImpossibleTravelAvailableOrderBy
        );
        const data = sorted.slice(skip, skip + limit);

        return this.paginationService.offsetPage(data, sorted.length, {
            skip,
            limit,
        });
    }

    async loginSpikeIpSummary(
        windowMs: number | null
    ): Promise<IAnalyticAnomalySummary> {
        const configured = this.configService.get<number>(
            'analytic.anomaly.loginSpikeIp.windowInMs'
        )!;
        const window = windowMs ?? configured;
        const cached =
            await this.analyticCache.getAnomalySummary<IAnalyticAnomalySummary>(
                'login-spike-ip',
                String(window)
            );
        if (cached) {
            return cached;
        }

        const rows = await this.computeLoginSpikeIp(window);
        const minUniqueAccounts = this.configService.get<number>(
            'analytic.anomaly.loginSpikeIp.minUniqueAccounts'
        )!;
        const summary: IAnalyticAnomalySummary = {
            count: rows.length,
            window: String(window),
            meta: {
                minUniqueAccounts,
            },
        };
        await this.analyticCache.setAnomalySummary(
            'login-spike-ip',
            String(window),
            summary
        );
        return summary;
    }

    async loginSpikeIpList(
        windowMs: number | null,
        params: IPaginationQueryOffsetParams<Prisma.ActivityLogWhereInput>
    ): Promise<IResponsePaginationReturn<IAnalyticLoginSpikeIp>> {
        const configured = this.configService.get<number>(
            'analytic.anomaly.loginSpikeIp.windowInMs'
        )!;
        const window = windowMs ?? configured;
        const rows = await this.computeLoginSpikeIp(window);
        const { skip, limit, orderBy } = params;
        const sorted = this.analyticSortUtil.sortRows(
            rows,
            orderBy,
            AnalyticLoginSpikeIpAvailableOrderBy
        );
        const data = sorted.slice(skip, skip + limit);

        return this.paginationService.offsetPage(data, sorted.length, {
            skip,
            limit,
        });
    }

    async failedLoginSpikeSummary(): Promise<IAnalyticAnomalySummary> {
        const cached =
            await this.analyticCache.getAnomalySummary<IAnalyticAnomalySummary>(
                'failed-login-spike',
                '_'
            );
        if (cached) {
            return cached;
        }

        const maxAttempt = this.configService.get<number>(
            'auth.password.maxAttempt'
        )!;
        const offset = this.configService.get<number>(
            'analytic.anomaly.failedLoginSpike.nearLockoutOffset'
        )!;
        const minAttempt = Math.max(1, maxAttempt - offset);
        const [buckets, near] = await Promise.all([
            this.userAnalyticDomain.groupPasswordAttemptBuckets(),
            this.userAnalyticDomain.findNearLockout(minAttempt),
        ]);
        const summary: IAnalyticAnomalySummary = {
            count: near.length,
            meta: {
                nearLockoutMinAttempt: minAttempt,
                bucketCount: buckets.length,
            },
        };
        await this.analyticCache.setAnomalySummary(
            'failed-login-spike',
            '_',
            summary
        );
        return summary;
    }

    async failedLoginSpikeList(
        params: IPaginationQueryOffsetParams<Prisma.UserWhereInput>
    ): Promise<IResponsePaginationReturn<IAnalyticNearLockout>> {
        const maxAttempt = this.configService.get<number>(
            'auth.password.maxAttempt'
        )!;
        const offset = this.configService.get<number>(
            'analytic.anomaly.failedLoginSpike.nearLockoutOffset'
        )!;
        return this.userAnalyticDomain.listNearLockoutOffset(
            Math.max(1, maxAttempt - offset),
            params
        );
    }

    async deviceProliferationSummary(): Promise<IAnalyticAnomalySummary> {
        const cached =
            await this.analyticCache.getAnomalySummary<IAnalyticAnomalySummary>(
                'device-proliferation',
                '_'
            );
        if (cached) {
            return cached;
        }

        const z = this.configService.get<number>(
            'analytic.anomaly.deviceProliferation.zScoreThreshold'
        )!;
        const result = await this.deviceAnalyticDomain.proliferationOutliers(z);
        const summary: IAnalyticAnomalySummary = {
            count: result.count,
            meta: {
                avg: result.avg,
                stdDev: result.stdDev,
                zScoreThreshold: z,
            },
        };
        await this.analyticCache.setAnomalySummary(
            'device-proliferation',
            '_',
            summary
        );
        return summary;
    }

    async deviceProliferationList(
        params: IPaginationQueryOffsetParams<Prisma.DeviceOwnershipWhereInput>
    ): Promise<IResponsePaginationReturn<IAnalyticDeviceProliferation>> {
        const z = this.configService.get<number>(
            'analytic.anomaly.deviceProliferation.zScoreThreshold'
        )!;
        const result = await this.deviceAnalyticDomain.proliferationOutliers(z);
        const { skip, limit, orderBy } = params;
        const sorted = this.analyticSortUtil.sortRows(
            result.rows,
            orderBy,
            AnalyticDeviceProliferationAvailableOrderBy
        );
        const data = sorted.slice(skip, skip + limit);

        return this.paginationService.offsetPage(data, sorted.length, {
            skip,
            limit,
        });
    }

    async loginTimeSummary(
        startDate: Date | null,
        endDate: Date | null
    ): Promise<IAnalyticAnomalySummary> {
        const window = this.windowToken(startDate, endDate, null);
        const cached =
            await this.analyticCache.getAnomalySummary<IAnalyticAnomalySummary>(
                'login-time',
                window
            );
        if (cached) {
            return cached;
        }

        const rows = await this.computeLoginTimeAnomalies(startDate, endDate);
        const summary: IAnalyticAnomalySummary = {
            count: rows.length,
            window,
        };
        await this.analyticCache.setAnomalySummary(
            'login-time',
            window,
            summary
        );
        return summary;
    }

    async loginTimeList(
        startDate: Date | null,
        endDate: Date | null,
        params: IPaginationQueryOffsetParams<Prisma.ActivityLogWhereInput>
    ): Promise<IResponsePaginationReturn<IAnalyticLoginTimeAnomaly>> {
        const rows = await this.computeLoginTimeAnomalies(startDate, endDate);
        const { skip, limit, orderBy } = params;
        const sorted = this.analyticSortUtil.sortRows(
            rows,
            orderBy,
            AnalyticLoginTimeAnomalyAvailableOrderBy
        );
        const data = sorted.slice(skip, skip + limit);

        return this.paginationService.offsetPage(data, sorted.length, {
            skip,
            limit,
        });
    }
}
