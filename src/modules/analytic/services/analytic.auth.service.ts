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
    AnalyticBucketsResultCacheSchema,
    AnalyticConcurrentSessionsSnapshotDataSchema,
    AnalyticForgotPasswordConversionCacheSchema,
    AnalyticLockoutMetricsCacheSchema,
    AnalyticMetricCountCacheSchema,
    AnalyticMfaAdoptionCacheSchema,
    AnalyticMfaAttemptSnapshotCacheSchema,
    AnalyticVerificationFunnelsCacheSchema,
} from '@modules/analytic/constants/analytic.constant';
import {
    EnumAnalyticDashboardMetric,
    EnumAnalyticGroupKey,
} from '@modules/analytic/enums/analytic.enum';
import type {
    IAnalyticBucketsResult,
    IAnalyticCountBucket,
    IAnalyticForgotPasswordConversion,
    IAnalyticLockoutMetrics,
    IAnalyticMetricCount,
    IAnalyticMfaAdoption,
    IAnalyticMfaAttemptSnapshot,
    IAnalyticSnapshotBucketsResult,
    IAnalyticSnapshotResult,
    IAnalyticVerificationFunnel,
    IAnalyticVerificationFunnels,
    IAnalyticVerificationGroupCount,
} from '@modules/analytic/interfaces/analytic.interface';
import { AnalyticAuthRepository } from '@modules/analytic/repositories/analytic.auth.repository';
import { AnalyticSnapshotService } from '@modules/analytic/services/analytic.snapshot.service';
import { AnalyticBucketUtil } from '@modules/analytic/utils/analytic.bucket.util';
import { AnalyticDateUtil } from '@modules/analytic/utils/analytic.date.util';
import { MfaUtil } from '@modules/mfa/utils/mfa.util';
import { UserLoginAnalyticActions } from '@modules/user/constants/user.constant';
import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Duration } from 'luxon';

@Injectable()
export class AnalyticAuthService {
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
        private readonly mfaUtil: MfaUtil,
        private readonly analyticAuthRepository: AnalyticAuthRepository
    ) {
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
        const key = this.dashboardKey(metric, startDate, endDate);

        return this.cacheService.readThrough(
            key,
            AnalyticMetricCountCacheSchema,
            this.analyticCache.dashboardTtlInMs,
            async () => {
                const count =
                    await this.analyticAuthRepository.countActivityByActions(
                        actions,
                        startDate,
                        endDate
                    );

                return { count };
            }
        );
    }

    private async countPasswordHistory(
        metric: EnumAnalyticDashboardMetric,
        type: EnumPasswordHistoryType,
        startDate: Date,
        endDate: Date
    ): Promise<IAnalyticMetricCount> {
        const key = this.dashboardKey(metric, startDate, endDate);

        return this.cacheService.readThrough(
            key,
            AnalyticMetricCountCacheSchema,
            this.analyticCache.dashboardTtlInMs,
            async () => {
                const count =
                    await this.analyticAuthRepository.countPasswordHistoryByType(
                        type,
                        startDate,
                        endDate
                    );

                return { count };
            }
        );
    }

    async authLoginFrequency(
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

    async authLoginMethod(
        startDate: Date | null,
        endDate: Date | null
    ): Promise<IAnalyticBucketsResult> {
        const key = this.dashboardKey(
            EnumAnalyticDashboardMetric.authLoginMethod,
            startDate,
            endDate
        );

        return this.cacheService.readThrough(
            key,
            AnalyticBucketsResultCacheSchema,
            this.analyticCache.dashboardTtlInMs,
            async () => {
                const rows =
                    await this.analyticAuthRepository.groupActivityByAction(
                        UserLoginAnalyticActions,
                        startDate,
                        endDate
                    );

                const buckets = this.analyticBucketUtil.toBuckets(
                    rows,
                    'action'
                );

                return { buckets };
            }
        );
    }

    async authLoginSource(
        startDate: Date | null,
        endDate: Date | null
    ): Promise<IAnalyticBucketsResult> {
        const key = this.dashboardKey(
            EnumAnalyticDashboardMetric.authLoginSource,
            startDate,
            endDate
        );

        return this.cacheService.readThrough(
            key,
            AnalyticBucketsResultCacheSchema,
            this.analyticCache.dashboardTtlInMs,
            async () => {
                const buckets =
                    await this.analyticAuthRepository.groupLoginSource(
                        startDate,
                        endDate
                    );

                return { buckets };
            }
        );
    }

    async authLockout(
        startDate: Date,
        endDate: Date
    ): Promise<IAnalyticLockoutMetrics> {
        const key = this.dashboardKey(
            EnumAnalyticDashboardMetric.authLockout,
            startDate,
            endDate
        );

        return this.cacheService.readThrough(
            key,
            AnalyticLockoutMetricsCacheSchema,
            this.analyticCache.dashboardTtlInMs,
            async () => {
                const rows =
                    await this.analyticAuthRepository.groupActivityByAction(
                        [
                            EnumActivityLogAction.userLoginFailed,
                            EnumActivityLogAction.userReachMaxPasswordAttempt,
                            EnumActivityLogAction.userReachMaxMfaAttempt,
                        ],
                        startDate,
                        endDate
                    );
                const countOf = (action: EnumActivityLogAction): number =>
                    rows.find(row => row.action === action)?.count ?? 0;

                return {
                    failed: countOf(EnumActivityLogAction.userLoginFailed),
                    maxAttempt:
                        countOf(
                            EnumActivityLogAction.userReachMaxPasswordAttempt
                        ) +
                        countOf(EnumActivityLogAction.userReachMaxMfaAttempt),
                };
            }
        );
    }

    async authSessionRevoke(
        startDate: Date,
        endDate: Date
    ): Promise<IAnalyticMetricCount> {
        return this.countByActions(
            EnumAnalyticDashboardMetric.authSessionRevoke,
            [
                EnumActivityLogAction.userRevokeSession,
                EnumActivityLogAction.userRevokeSessionByAdmin,
                EnumActivityLogAction.userRevokeAllSessions,
                EnumActivityLogAction.userRevokeAllSessionsByAdmin,
                EnumActivityLogAction.userRevokeSessionByDeviceLogin,
            ],
            startDate,
            endDate
        );
    }

    async computeConcurrentSessions(): Promise<
        IAnalyticSnapshotResult<IAnalyticCountBucket, null>
    > {
        const now = this.helperDateService.create();
        const idleSince = this.idleSince(now);
        const buckets =
            await this.analyticAuthRepository.findConcurrentSessions(
                now,
                idleSince
            );

        return this.analyticBucketUtil.toBucketSnapshot(buckets);
    }

    async authConcurrentSessions(): Promise<IAnalyticSnapshotBucketsResult> {
        return this.analyticSnapshotService.getBuckets(
            EnumAnalyticSnapshotSignal.concurrentSessions,
            AnalyticConcurrentSessionsSnapshotDataSchema
        );
    }

    async authSessionsGeo(
        startDate: Date,
        endDate: Date
    ): Promise<IAnalyticBucketsResult> {
        const key = this.dashboardKey(
            EnumAnalyticDashboardMetric.authSessionsGeo,
            startDate,
            endDate
        );

        return this.cacheService.readThrough(
            key,
            AnalyticBucketsResultCacheSchema,
            this.analyticCache.dashboardTtlInMs,
            async () => {
                const now = this.helperDateService.create();
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
        );
    }

    async authSessionsUserAgent(
        startDate: Date,
        endDate: Date
    ): Promise<IAnalyticBucketsResult> {
        const key = this.dashboardKey(
            EnumAnalyticDashboardMetric.authSessionsUa,
            startDate,
            endDate
        );

        return this.cacheService.readThrough(
            key,
            AnalyticBucketsResultCacheSchema,
            this.analyticCache.dashboardTtlInMs,
            async () => {
                const now = this.helperDateService.create();
                const idleSince = this.idleSince(now);
                const rows =
                    await this.analyticAuthRepository.groupSessionsUserAgent(
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
        );
    }

    async authRefreshTokenVolume(
        startDate: Date,
        endDate: Date
    ): Promise<IAnalyticMetricCount> {
        return this.countByActions(
            EnumAnalyticDashboardMetric.authRefresh,
            [EnumActivityLogAction.userRefreshToken],
            startDate,
            endDate
        );
    }

    async authLogoutRate(
        startDate: Date,
        endDate: Date
    ): Promise<IAnalyticMetricCount> {
        return this.countByActions(
            EnumAnalyticDashboardMetric.authLogout,
            [EnumActivityLogAction.userLogout],
            startDate,
            endDate
        );
    }

    async authVerificationFunnel(
        startDate: Date,
        endDate: Date
    ): Promise<IAnalyticVerificationFunnels> {
        const key = this.dashboardKey(
            EnumAnalyticDashboardMetric.authVerificationFunnel,
            startDate,
            endDate
        );

        return this.cacheService.readThrough(
            key,
            AnalyticVerificationFunnelsCacheSchema,
            this.analyticCache.dashboardTtlInMs,
            async () => {
                const rows =
                    await this.analyticAuthRepository.groupVerificationFunnel(
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
        );
    }

    async authPasswordChange(
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

    async authForgotPasswordConversion(
        startDate: Date,
        endDate: Date
    ): Promise<IAnalyticForgotPasswordConversion> {
        const key = this.dashboardKey(
            EnumAnalyticDashboardMetric.authForgotConversion,
            startDate,
            endDate
        );

        return this.cacheService.readThrough(
            key,
            AnalyticForgotPasswordConversionCacheSchema,
            this.analyticCache.dashboardTtlInMs,
            async () => {
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
        );
    }

    async authAdminForcePassword(
        startDate: Date,
        endDate: Date
    ): Promise<IAnalyticMetricCount> {
        return this.countPasswordHistory(
            EnumAnalyticDashboardMetric.authAdminForcePassword,
            EnumPasswordHistoryType.admin,
            startDate,
            endDate
        );
    }

    async authMfaAdoption(): Promise<IAnalyticMfaAdoption> {
        const key = this.dashboardKey(
            EnumAnalyticDashboardMetric.authMfaAdoption,
            null,
            null
        );

        return this.cacheService.readThrough(
            key,
            AnalyticMfaAdoptionCacheSchema,
            this.analyticCache.dashboardTtlInMs,
            async () => {
                const { enabled, total } =
                    await this.analyticAuthRepository.findMfaAdoption();

                return this.mfaUtil.mapAdoption(enabled, total);
            }
        );
    }

    async authMfaAdminReset(
        startDate: Date,
        endDate: Date
    ): Promise<IAnalyticMetricCount> {
        return this.countByActions(
            EnumAnalyticDashboardMetric.authMfaAdminReset,
            [EnumActivityLogAction.userResetMfaByAdmin],
            startDate,
            endDate
        );
    }

    async authMfaVerifySuccess(
        startDate: Date,
        endDate: Date
    ): Promise<IAnalyticMetricCount> {
        return this.countByActions(
            EnumAnalyticDashboardMetric.authMfaVerify,
            [EnumActivityLogAction.userVerifyMfa],
            startDate,
            endDate
        );
    }

    async authBackupCodeRegeneration(
        startDate: Date,
        endDate: Date
    ): Promise<IAnalyticMetricCount> {
        return this.countByActions(
            EnumAnalyticDashboardMetric.authBackupCodeRegeneration,
            [EnumActivityLogAction.userRegenerateMfaBackupCodes],
            startDate,
            endDate
        );
    }

    async authMfaAttempt(): Promise<IAnalyticMfaAttemptSnapshot> {
        const key = this.dashboardKey(
            EnumAnalyticDashboardMetric.authMfaAttempt,
            null,
            null
        );

        return this.cacheService.readThrough(
            key,
            AnalyticMfaAttemptSnapshotCacheSchema,
            this.analyticCache.dashboardTtlInMs,
            () => this.analyticAuthRepository.findMfaAttempt()
        );
    }
}
