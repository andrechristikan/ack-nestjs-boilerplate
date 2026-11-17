import { CacheService } from '@common/cache/services/cache.service';
import { HelperDateService } from '@common/helper/services/helper.date.service';
import type { IPaginationQueryOffsetParams } from '@common/pagination/interfaces/pagination.interface';
import type { IResponsePaginationReturn } from '@common/response/interfaces/response.interface';
import { ActivityLogAnalyticService } from '@modules/activity-log/services/activity-log.analytic.service';
import { AnalyticCache } from '@modules/analytic/caches/analytic.cache';
import {
    AnalyticApiKeyActiveExpiredCacheSchema,
    AnalyticApiKeyLifecycleCacheSchema,
    AnalyticBlockedUsersCacheSchema,
    AnalyticBucketsResultCacheSchema,
    AnalyticCountRanges,
    AnalyticForgotPasswordConversionCacheSchema,
    AnalyticLockoutMetricsCacheSchema,
    AnalyticMetricCountCacheSchema,
    AnalyticMetricRateCacheSchema,
    AnalyticMfaAdoptionCacheSchema,
    AnalyticMfaAttemptSnapshotCacheSchema,
    AnalyticMobileChurnCacheSchema,
    AnalyticProjectCountPageCacheSchema,
    AnalyticProjectCreationCacheSchema,
    AnalyticSessionDeviceRatioCacheSchema,
    AnalyticStatusCountsCacheSchema,
    AnalyticTermPolicyAcceptanceRateCacheSchema,
    AnalyticTermPolicyTimeToAcceptCacheSchema,
    AnalyticVerificationFunnelsCacheSchema,
    AnalyticWorkspaceCountPageCacheSchema,
} from '@modules/analytic/constants/analytic.constant';
import {
    EnumAnalyticDashboardMetric,
    EnumAnalyticGroupKey,
} from '@modules/analytic/enums/analytic.enum';
import type {
    IAnalyticApiKeyActiveExpired,
    IAnalyticApiKeyLifecycle,
    IAnalyticBlockedUsers,
    IAnalyticBucketsResult,
    IAnalyticCountBucket,
    IAnalyticForgotPasswordConversion,
    IAnalyticLockoutMetrics,
    IAnalyticMetricCount,
    IAnalyticMetricRate,
    IAnalyticMfaAdoption,
    IAnalyticMfaAttemptSnapshot,
    IAnalyticMobileChurn,
    IAnalyticProjectCount,
    IAnalyticProjectCreation,
    IAnalyticSessionDeviceRatio,
    IAnalyticStatusCount,
    IAnalyticTermPolicyAcceptanceRate,
    IAnalyticTermPolicyTimeToAccept,
    IAnalyticVerificationFunnels,
    IAnalyticWorkspaceCount,
} from '@modules/analytic/interfaces/analytic.interface';
import { AnalyticBucketUtil } from '@modules/analytic/utils/analytic.bucket.util';
import { AnalyticDateUtil } from '@modules/analytic/utils/analytic.date.util';
import { ApiKeyAnalyticService } from '@modules/api-key/services/api-key.analytic.service';
import { DeviceAnalyticService } from '@modules/device/services/device.analytic.service';
import { PasswordHistoryAnalyticService } from '@modules/password-history/services/password-history.analytic.service';
import { ProjectAnalyticService } from '@modules/project/services/project.analytic.service';
import { ProjectMemberAnalyticService } from '@modules/project/services/project.member.analytic.service';
import type { ISessionAnalyticSession } from '@modules/session/interfaces/session.interface';
import { SessionAnalyticService } from '@modules/session/services/session.analytic.service';
import { TermPolicyAcceptanceAnalyticService } from '@modules/term-policy/services/term-policy.acceptance.analytic.service';
import { UserLoginAnalyticActions } from '@modules/user/constants/user.constant';
import { UserAnalyticService } from '@modules/user/services/user.analytic.service';
import { UserForgotPasswordAnalyticService } from '@modules/user/services/user.forgot-password.analytic.service';
import { UserMobileNumberAnalyticService } from '@modules/user/services/user.mobile-number.analytic.service';
import { MfaUtil } from '@modules/mfa/utils/mfa.util';
import { MfaAnalyticService } from '@modules/mfa/services/mfa.analytic.service';
import { UserVerificationAnalyticService } from '@modules/user/services/user.verification.analytic.service';
import { WorkspaceAnalyticService } from '@modules/workspace/services/workspace.analytic.service';
import { WorkspaceInviteAnalyticService } from '@modules/workspace/services/workspace.invite.analytic.service';
import { WorkspaceJoinRequestAnalyticService } from '@modules/workspace/services/workspace.join-request.analytic.service';
import { WorkspaceMemberAnalyticService } from '@modules/workspace/services/workspace.member.analytic.service';
import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
    EnumActivityLogAction,
    EnumPasswordHistoryType,
    EnumUserStatus,
    EnumVerificationType,
} from '@generated/prisma-client/client';
import { Duration } from 'luxon';

@Injectable()
export class AnalyticDashboardService {
    private readonly deviceInactivityInMs: number;

    constructor(
        private readonly configService: ConfigService,
        private readonly analyticCache: AnalyticCache,
        private readonly cacheService: CacheService,
        private readonly analyticDateUtil: AnalyticDateUtil,
        private readonly analyticBucketUtil: AnalyticBucketUtil,
        private readonly helperDateService: HelperDateService,
        private readonly userAnalyticService: UserAnalyticService,
        private readonly userForgotPasswordAnalyticService: UserForgotPasswordAnalyticService,
        private readonly mfaAnalyticService: MfaAnalyticService,
        private readonly mfaUtil: MfaUtil,
        private readonly userVerificationAnalyticService: UserVerificationAnalyticService,
        private readonly userMobileNumberAnalyticService: UserMobileNumberAnalyticService,
        private readonly activityLogAnalyticService: ActivityLogAnalyticService,
        private readonly passwordHistoryAnalyticService: PasswordHistoryAnalyticService,
        private readonly sessionAnalyticService: SessionAnalyticService,
        private readonly deviceAnalyticService: DeviceAnalyticService,
        private readonly apiKeyAnalyticService: ApiKeyAnalyticService,
        private readonly termPolicyAcceptanceAnalyticService: TermPolicyAcceptanceAnalyticService,
        private readonly workspaceAnalyticService: WorkspaceAnalyticService,
        private readonly workspaceInviteAnalyticService: WorkspaceInviteAnalyticService,
        private readonly workspaceJoinRequestAnalyticService: WorkspaceJoinRequestAnalyticService,
        private readonly workspaceMemberAnalyticService: WorkspaceMemberAnalyticService,
        private readonly projectAnalyticService: ProjectAnalyticService,
        private readonly projectMemberAnalyticService: ProjectMemberAnalyticService
    ) {
        this.deviceInactivityInMs = this.configService.get<number>(
            'analytic.device.inactivityInMs'
        )!;
    }

    private dashboardKey(
        metric: string,
        startDate: Date | null,
        endDate: Date | null
    ): string {
        const start = this.analyticDateUtil.cacheToken(startDate);
        const end = this.analyticDateUtil.cacheToken(endDate);

        return this.analyticCache.buildDashboardKey(metric, start, end);
    }

    private toBucketsByBrowser(
        sessions: ISessionAnalyticSession[]
    ): IAnalyticCountBucket[] {
        const counts = new Map<string, number>();
        for (const session of sessions) {
            const key =
                session.userAgent.browser?.name ??
                session.userAgent.os?.name ??
                EnumAnalyticGroupKey.unknown;
            counts.set(key, (counts.get(key) ?? 0) + 1);
        }

        return [...counts.entries()].map(([key, count]) => ({ key, count }));
    }

    private toBucketsByCountRange<T extends { count: number }>(
        rows: T[]
    ): IAnalyticCountBucket[] {
        return AnalyticCountRanges.map(range => ({
            key: range.key,
            count: rows.filter(
                row =>
                    row.count >= range.min &&
                    (range.max === null || row.count <= range.max)
            ).length,
        }));
    }

    private dashboardPageKey(
        metric: EnumAnalyticDashboardMetric,
        startDate: Date | null,
        endDate: Date | null,
        skip: number,
        limit: number
    ): string {
        const start = this.analyticDateUtil.cacheToken(startDate);
        const end = this.analyticDateUtil.cacheToken(endDate);

        return this.analyticCache.buildDashboardPageKey(
            metric,
            start,
            end,
            Math.floor(skip / limit) + 1,
            limit
        );
    }

    async usersRegistrations(
        startDate: Date,
        endDate: Date
    ): Promise<IAnalyticMetricCount> {
        const metric = EnumAnalyticDashboardMetric.usersRegistrations;
        const key = this.dashboardKey(metric, startDate, endDate);

        return this.cacheService.readThrough(
            key,
            AnalyticMetricCountCacheSchema,
            this.analyticCache.dashboardTtlInMs,
            async () => {
                const count =
                    await this.userAnalyticService.getCountRegistrations(
                        startDate,
                        endDate
                    );

                return { count };
            }
        );
    }

    async usersChurn(
        startDate: Date,
        endDate: Date
    ): Promise<IAnalyticMetricRate> {
        const metric = EnumAnalyticDashboardMetric.usersChurn;
        const key = this.dashboardKey(metric, startDate, endDate);

        return this.cacheService.readThrough(
            key,
            AnalyticMetricRateCacheSchema,
            this.analyticCache.dashboardTtlInMs,
            () => this.userAnalyticService.getChurnRate(startDate, endDate)
        );
    }

    async usersBlocked(
        startDate: Date,
        endDate: Date
    ): Promise<IAnalyticBlockedUsers> {
        const metric = EnumAnalyticDashboardMetric.usersBlocked;
        const key = this.dashboardKey(metric, startDate, endDate);

        return this.cacheService.readThrough(
            key,
            AnalyticBlockedUsersCacheSchema,
            this.analyticCache.dashboardTtlInMs,
            async () => {
                const [trend, current] = await Promise.all([
                    this.activityLogAnalyticService.getCountByActionsInRange(
                        [EnumActivityLogAction.userBlocked],
                        startDate,
                        endDate
                    ),
                    this.userAnalyticService.getCountByStatus(
                        EnumUserStatus.blocked
                    ),
                ]);

                return { trend, current };
            }
        );
    }

    async usersSignUpWith(
        startDate: Date | null,
        endDate: Date | null
    ): Promise<IAnalyticBucketsResult> {
        const metric = EnumAnalyticDashboardMetric.usersSignUpWith;
        const key = this.dashboardKey(metric, startDate, endDate);

        return this.cacheService.readThrough(
            key,
            AnalyticBucketsResultCacheSchema,
            this.analyticCache.dashboardTtlInMs,
            async () => {
                const rows =
                    await this.userAnalyticService.getGroupBySignUpWith(
                        startDate,
                        endDate
                    );

                const buckets = this.analyticBucketUtil.toBuckets(rows, 'key');

                return { buckets };
            }
        );
    }

    async usersSignUpFrom(
        startDate: Date | null,
        endDate: Date | null
    ): Promise<IAnalyticBucketsResult> {
        const metric = EnumAnalyticDashboardMetric.usersSignUpFrom;
        const key = this.dashboardKey(metric, startDate, endDate);

        return this.cacheService.readThrough(
            key,
            AnalyticBucketsResultCacheSchema,
            this.analyticCache.dashboardTtlInMs,
            async () => {
                const rows =
                    await this.userAnalyticService.getGroupBySignUpFrom(
                        startDate,
                        endDate
                    );

                const buckets = this.analyticBucketUtil.toBuckets(rows, 'key');

                return { buckets };
            }
        );
    }

    async usersEmailVerification(
        startDate: Date | null,
        endDate: Date | null
    ): Promise<IAnalyticMetricRate> {
        const metric = EnumAnalyticDashboardMetric.usersEmailVerification;
        const key = this.dashboardKey(metric, startDate, endDate);

        return this.cacheService.readThrough(
            key,
            AnalyticMetricRateCacheSchema,
            this.analyticCache.dashboardTtlInMs,
            () =>
                this.userAnalyticService.getEmailVerificationRate(
                    startDate,
                    endDate
                )
        );
    }

    async usersMobileVerification(
        startDate: Date | null,
        endDate: Date | null
    ): Promise<IAnalyticMetricRate> {
        const metric = EnumAnalyticDashboardMetric.usersMobileVerification;
        const key = this.dashboardKey(metric, startDate, endDate);

        return this.cacheService.readThrough(
            key,
            AnalyticMetricRateCacheSchema,
            this.analyticCache.dashboardTtlInMs,
            () =>
                this.userMobileNumberAnalyticService.getVerificationRate(
                    startDate,
                    endDate
                )
        );
    }

    async usersStatusDistribution(): Promise<IAnalyticBucketsResult> {
        const metric = EnumAnalyticDashboardMetric.usersStatus;
        const key = this.dashboardKey(metric, null, null);

        return this.cacheService.readThrough(
            key,
            AnalyticBucketsResultCacheSchema,
            this.analyticCache.dashboardTtlInMs,
            async () => {
                const rows = await this.userAnalyticService.getGroupByStatus();

                const buckets = this.analyticBucketUtil.toBuckets(rows, 'key');

                return { buckets };
            }
        );
    }

    async usersCountryDistribution(): Promise<IAnalyticBucketsResult> {
        const metric = EnumAnalyticDashboardMetric.usersCountry;
        const key = this.dashboardKey(metric, null, null);

        return this.cacheService.readThrough(
            key,
            AnalyticBucketsResultCacheSchema,
            this.analyticCache.dashboardTtlInMs,
            async () => {
                const rows = await this.userAnalyticService.getGroupByCountry();

                return { buckets: rows };
            }
        );
    }

    async usersRoleDistribution(): Promise<IAnalyticBucketsResult> {
        const metric = EnumAnalyticDashboardMetric.usersRole;
        const key = this.dashboardKey(metric, null, null);

        return this.cacheService.readThrough(
            key,
            AnalyticBucketsResultCacheSchema,
            this.analyticCache.dashboardTtlInMs,
            async () => {
                const rows = await this.userAnalyticService.getGroupByRole();

                return { buckets: rows };
            }
        );
    }

    async usersSelfDelete(
        startDate: Date,
        endDate: Date
    ): Promise<IAnalyticMetricCount> {
        const metric = EnumAnalyticDashboardMetric.usersSelfDelete;
        const key = this.dashboardKey(metric, startDate, endDate);

        return this.cacheService.readThrough(
            key,
            AnalyticMetricCountCacheSchema,
            this.analyticCache.dashboardTtlInMs,
            async () => {
                const count =
                    await this.activityLogAnalyticService.getCountByActionsInRange(
                        [EnumActivityLogAction.userDeleteSelf],
                        startDate,
                        endDate
                    );

                return { count };
            }
        );
    }

    async usersClaimUsername(
        startDate: Date,
        endDate: Date
    ): Promise<IAnalyticMetricCount> {
        const metric = EnumAnalyticDashboardMetric.usersClaimUsername;
        const key = this.dashboardKey(metric, startDate, endDate);

        return this.cacheService.readThrough(
            key,
            AnalyticMetricCountCacheSchema,
            this.analyticCache.dashboardTtlInMs,
            async () => {
                const count =
                    await this.activityLogAnalyticService.getCountByActionsInRange(
                        [EnumActivityLogAction.userClaimUsername],
                        startDate,
                        endDate
                    );

                return { count };
            }
        );
    }

    async usersMobileChurn(
        startDate: Date,
        endDate: Date
    ): Promise<IAnalyticMobileChurn> {
        const metric = EnumAnalyticDashboardMetric.usersMobileChurn;
        const key = this.dashboardKey(metric, startDate, endDate);

        return this.cacheService.readThrough(
            key,
            AnalyticMobileChurnCacheSchema,
            this.analyticCache.dashboardTtlInMs,
            async () => {
                const [added, updated, deleted] = await Promise.all([
                    this.activityLogAnalyticService.getCountByActionsInRange(
                        [EnumActivityLogAction.userAddMobileNumber],
                        startDate,
                        endDate
                    ),
                    this.activityLogAnalyticService.getCountByActionsInRange(
                        [EnumActivityLogAction.userUpdateMobileNumber],
                        startDate,
                        endDate
                    ),
                    this.activityLogAnalyticService.getCountByActionsInRange(
                        [EnumActivityLogAction.userDeleteMobileNumber],
                        startDate,
                        endDate
                    ),
                ]);

                return { added, updated, deleted };
            }
        );
    }

    async authLoginFrequency(
        startDate: Date,
        endDate: Date
    ): Promise<IAnalyticMetricCount> {
        const metric = EnumAnalyticDashboardMetric.authLoginFrequency;
        const key = this.dashboardKey(metric, startDate, endDate);

        return this.cacheService.readThrough(
            key,
            AnalyticMetricCountCacheSchema,
            this.analyticCache.dashboardTtlInMs,
            async () => {
                const count =
                    await this.activityLogAnalyticService.getCountByActionsInRange(
                        UserLoginAnalyticActions,
                        startDate,
                        endDate
                    );

                return { count };
            }
        );
    }

    async authLoginMethod(
        startDate: Date | null,
        endDate: Date | null
    ): Promise<IAnalyticBucketsResult> {
        const metric = EnumAnalyticDashboardMetric.authLoginMethod;
        const key = this.dashboardKey(metric, startDate, endDate);

        return this.cacheService.readThrough(
            key,
            AnalyticBucketsResultCacheSchema,
            this.analyticCache.dashboardTtlInMs,
            async () => {
                const rows =
                    await this.activityLogAnalyticService.getGroupByActionInRange(
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
        const metric = EnumAnalyticDashboardMetric.authLoginSource;
        const key = this.dashboardKey(metric, startDate, endDate);

        return this.cacheService.readThrough(
            key,
            AnalyticBucketsResultCacheSchema,
            this.analyticCache.dashboardTtlInMs,
            async () => {
                const rows = await this.userAnalyticService.getGroupLoginSource(
                    startDate,
                    endDate
                );

                const buckets = this.analyticBucketUtil.toBuckets(rows, 'key');

                return { buckets };
            }
        );
    }

    async authLockout(
        startDate: Date,
        endDate: Date
    ): Promise<IAnalyticLockoutMetrics> {
        const metric = EnumAnalyticDashboardMetric.authLockout;
        const key = this.dashboardKey(metric, startDate, endDate);

        return this.cacheService.readThrough(
            key,
            AnalyticLockoutMetricsCacheSchema,
            this.analyticCache.dashboardTtlInMs,
            async () => {
                const [failed, maxAttempt] = await Promise.all([
                    this.activityLogAnalyticService.getCountByActionsInRange(
                        [EnumActivityLogAction.userLoginFailed],
                        startDate,
                        endDate
                    ),
                    this.activityLogAnalyticService.getCountByActionsInRange(
                        [
                            EnumActivityLogAction.userReachMaxPasswordAttempt,
                            EnumActivityLogAction.userReachMaxMfaAttempt,
                        ],
                        startDate,
                        endDate
                    ),
                ]);

                return { failed, maxAttempt };
            }
        );
    }

    async authSessionRevoke(
        startDate: Date,
        endDate: Date
    ): Promise<IAnalyticMetricCount> {
        const metric = EnumAnalyticDashboardMetric.authSessionRevoke;
        const key = this.dashboardKey(metric, startDate, endDate);

        return this.cacheService.readThrough(
            key,
            AnalyticMetricCountCacheSchema,
            this.analyticCache.dashboardTtlInMs,
            async () => {
                const count =
                    await this.activityLogAnalyticService.getCountByActionsInRange(
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

                return { count };
            }
        );
    }

    async authConcurrentSessions(): Promise<IAnalyticBucketsResult> {
        const metric = EnumAnalyticDashboardMetric.authConcurrent;
        const key = this.dashboardKey(metric, null, null);

        return this.cacheService.readThrough(
            key,
            AnalyticBucketsResultCacheSchema,
            this.analyticCache.dashboardTtlInMs,
            async () => {
                const now = this.helperDateService.create();
                const rows =
                    await this.sessionAnalyticService.getCountActiveByUser(now);

                const buckets = this.toBucketsByCountRange(rows);

                return { buckets };
            }
        );
    }

    async authSessionsGeo(
        startDate: Date | null,
        endDate: Date | null
    ): Promise<IAnalyticBucketsResult> {
        const metric = EnumAnalyticDashboardMetric.authSessionsGeo;
        const key = this.dashboardKey(metric, startDate, endDate);

        return this.cacheService.readThrough(
            key,
            AnalyticBucketsResultCacheSchema,
            this.analyticCache.dashboardTtlInMs,
            async () => {
                const now = this.helperDateService.create();
                const rows =
                    await this.sessionAnalyticService.getGroupByCountry(
                        startDate,
                        endDate,
                        now
                    );

                return { buckets: rows };
            }
        );
    }

    async authSessionsUserAgent(
        startDate: Date | null,
        endDate: Date | null
    ): Promise<IAnalyticBucketsResult> {
        const metric = EnumAnalyticDashboardMetric.authSessionsUa;
        const key = this.dashboardKey(metric, startDate, endDate);

        return this.cacheService.readThrough(
            key,
            AnalyticBucketsResultCacheSchema,
            this.analyticCache.dashboardTtlInMs,
            async () => {
                const now = this.helperDateService.create();
                const sessions =
                    await this.sessionAnalyticService.getActiveInRange(
                        startDate,
                        endDate,
                        now
                    );

                const buckets = this.toBucketsByBrowser(sessions);

                return { buckets };
            }
        );
    }

    async authRefreshTokenVolume(
        startDate: Date,
        endDate: Date
    ): Promise<IAnalyticMetricCount> {
        const metric = EnumAnalyticDashboardMetric.authRefresh;
        const key = this.dashboardKey(metric, startDate, endDate);

        return this.cacheService.readThrough(
            key,
            AnalyticMetricCountCacheSchema,
            this.analyticCache.dashboardTtlInMs,
            async () => {
                const count =
                    await this.activityLogAnalyticService.getCountByActionsInRange(
                        [EnumActivityLogAction.userRefreshToken],
                        startDate,
                        endDate
                    );

                return { count };
            }
        );
    }

    async authLogoutRate(
        startDate: Date,
        endDate: Date
    ): Promise<IAnalyticMetricCount> {
        const metric = EnumAnalyticDashboardMetric.authLogout;
        const key = this.dashboardKey(metric, startDate, endDate);

        return this.cacheService.readThrough(
            key,
            AnalyticMetricCountCacheSchema,
            this.analyticCache.dashboardTtlInMs,
            async () => {
                const count =
                    await this.activityLogAnalyticService.getCountByActionsInRange(
                        [EnumActivityLogAction.userLogout],
                        startDate,
                        endDate
                    );

                return { count };
            }
        );
    }

    async authVerificationFunnel(
        startDate: Date,
        endDate: Date
    ): Promise<IAnalyticVerificationFunnels> {
        const metric = EnumAnalyticDashboardMetric.authVerificationFunnel;
        const key = this.dashboardKey(metric, startDate, endDate);

        return this.cacheService.readThrough(
            key,
            AnalyticVerificationFunnelsCacheSchema,
            this.analyticCache.dashboardTtlInMs,
            async () => {
                const [email, mobile] = await Promise.all([
                    this.userVerificationAnalyticService.getFunnel(
                        EnumVerificationType.email,
                        startDate,
                        endDate
                    ),
                    this.userVerificationAnalyticService.getFunnel(
                        EnumVerificationType.mobileNumber,
                        startDate,
                        endDate
                    ),
                ]);

                return { email, mobile };
            }
        );
    }

    async authPasswordChange(
        startDate: Date,
        endDate: Date
    ): Promise<IAnalyticMetricCount> {
        const metric = EnumAnalyticDashboardMetric.authPasswordChange;
        const key = this.dashboardKey(metric, startDate, endDate);

        return this.cacheService.readThrough(
            key,
            AnalyticMetricCountCacheSchema,
            this.analyticCache.dashboardTtlInMs,
            async () => {
                const count =
                    await this.passwordHistoryAnalyticService.getCountByTypeInRange(
                        EnumPasswordHistoryType.profile,
                        startDate,
                        endDate
                    );

                return { count };
            }
        );
    }

    async authForgotPasswordConversion(
        startDate: Date,
        endDate: Date
    ): Promise<IAnalyticForgotPasswordConversion> {
        const metric = EnumAnalyticDashboardMetric.authForgotConversion;
        const key = this.dashboardKey(metric, startDate, endDate);

        return this.cacheService.readThrough(
            key,
            AnalyticForgotPasswordConversionCacheSchema,
            this.analyticCache.dashboardTtlInMs,
            () =>
                this.userForgotPasswordAnalyticService.getConversion(
                    startDate,
                    endDate
                )
        );
    }

    async authAdminForcePassword(
        startDate: Date,
        endDate: Date
    ): Promise<IAnalyticMetricCount> {
        const metric = EnumAnalyticDashboardMetric.authAdminForcePassword;
        const key = this.dashboardKey(metric, startDate, endDate);

        return this.cacheService.readThrough(
            key,
            AnalyticMetricCountCacheSchema,
            this.analyticCache.dashboardTtlInMs,
            async () => {
                const count =
                    await this.passwordHistoryAnalyticService.getCountByTypeInRange(
                        EnumPasswordHistoryType.admin,
                        startDate,
                        endDate
                    );

                return { count };
            }
        );
    }

    async authMfaAdoption(): Promise<IAnalyticMfaAdoption> {
        const metric = EnumAnalyticDashboardMetric.authMfaAdoption;
        const key = this.dashboardKey(metric, null, null);

        return this.cacheService.readThrough(
            key,
            AnalyticMfaAdoptionCacheSchema,
            this.analyticCache.dashboardTtlInMs,
            async () => {
                const [activeUserCount, enabled] = await Promise.all([
                    this.userAnalyticService.getCountActive(),
                    this.mfaAnalyticService.getEnabledCount(),
                ]);

                return this.mfaUtil.mapAdoption(enabled, activeUserCount);
            }
        );
    }

    async authMfaAdminReset(
        startDate: Date,
        endDate: Date
    ): Promise<IAnalyticMetricCount> {
        const metric = EnumAnalyticDashboardMetric.authMfaAdminReset;
        const key = this.dashboardKey(metric, startDate, endDate);

        return this.cacheService.readThrough(
            key,
            AnalyticMetricCountCacheSchema,
            this.analyticCache.dashboardTtlInMs,
            async () => {
                const count =
                    await this.activityLogAnalyticService.getCountByActionsInRange(
                        [EnumActivityLogAction.userResetMfaByAdmin],
                        startDate,
                        endDate
                    );

                return { count };
            }
        );
    }

    async authMfaVerifySuccess(
        startDate: Date,
        endDate: Date
    ): Promise<IAnalyticMetricCount> {
        const metric = EnumAnalyticDashboardMetric.authMfaVerify;
        const key = this.dashboardKey(metric, startDate, endDate);

        return this.cacheService.readThrough(
            key,
            AnalyticMetricCountCacheSchema,
            this.analyticCache.dashboardTtlInMs,
            async () => {
                const count =
                    await this.activityLogAnalyticService.getCountByActionsInRange(
                        [EnumActivityLogAction.userVerifyMfa],
                        startDate,
                        endDate
                    );

                return { count };
            }
        );
    }

    async authBackupCodeRegeneration(
        startDate: Date,
        endDate: Date
    ): Promise<IAnalyticMetricCount> {
        const metric = EnumAnalyticDashboardMetric.authBackupCodeRegeneration;
        const key = this.dashboardKey(metric, startDate, endDate);

        return this.cacheService.readThrough(
            key,
            AnalyticMetricCountCacheSchema,
            this.analyticCache.dashboardTtlInMs,
            async () => {
                const count =
                    await this.activityLogAnalyticService.getCountByActionsInRange(
                        [EnumActivityLogAction.userRegenerateMfaBackupCodes],
                        startDate,
                        endDate
                    );

                return { count };
            }
        );
    }

    async authMfaAttempt(): Promise<IAnalyticMfaAttemptSnapshot> {
        const metric = EnumAnalyticDashboardMetric.authMfaAttempt;
        const key = this.dashboardKey(metric, null, null);

        return this.cacheService.readThrough(
            key,
            AnalyticMfaAttemptSnapshotCacheSchema,
            this.analyticCache.dashboardTtlInMs,
            () => this.mfaAnalyticService.getAttemptSnapshot()
        );
    }

    async devicesRegistration(
        startDate: Date,
        endDate: Date
    ): Promise<IAnalyticMetricCount> {
        const metric = EnumAnalyticDashboardMetric.devicesRegistration;
        const key = this.dashboardKey(metric, startDate, endDate);

        return this.cacheService.readThrough(
            key,
            AnalyticMetricCountCacheSchema,
            this.analyticCache.dashboardTtlInMs,
            async () => {
                const count =
                    await this.deviceAnalyticService.getCountRegistrations(
                        startDate,
                        endDate
                    );

                return { count };
            }
        );
    }

    async devicesPlatform(): Promise<IAnalyticBucketsResult> {
        const metric = EnumAnalyticDashboardMetric.devicesPlatform;
        const key = this.dashboardKey(metric, null, null);

        return this.cacheService.readThrough(
            key,
            AnalyticBucketsResultCacheSchema,
            this.analyticCache.dashboardTtlInMs,
            async () => {
                const rows =
                    await this.deviceAnalyticService.getGroupByPlatform();

                return { buckets: rows };
            }
        );
    }

    async devicesPushToken(): Promise<IAnalyticMetricRate> {
        const metric = EnumAnalyticDashboardMetric.devicesPushToken;
        const key = this.dashboardKey(metric, null, null);

        return this.cacheService.readThrough(
            key,
            AnalyticMetricRateCacheSchema,
            this.analyticCache.dashboardTtlInMs,
            () => this.deviceAnalyticService.getPushTokenRate()
        );
    }

    async devicesInfoRefresh(
        startDate: Date,
        endDate: Date
    ): Promise<IAnalyticMetricCount> {
        const metric = EnumAnalyticDashboardMetric.devicesInfoRefresh;
        const key = this.dashboardKey(metric, startDate, endDate);

        return this.cacheService.readThrough(
            key,
            AnalyticMetricCountCacheSchema,
            this.analyticCache.dashboardTtlInMs,
            async () => {
                const count =
                    await this.activityLogAnalyticService.getCountByActionsInRange(
                        [EnumActivityLogAction.userDeviceRefresh],
                        startDate,
                        endDate
                    );

                return { count };
            }
        );
    }

    async devicesSessionRatio(): Promise<IAnalyticSessionDeviceRatio> {
        const metric = EnumAnalyticDashboardMetric.devicesSessionRatio;
        const key = this.dashboardKey(metric, null, null);

        return this.cacheService.readThrough(
            key,
            AnalyticSessionDeviceRatioCacheSchema,
            this.analyticCache.dashboardTtlInMs,
            async () => {
                const now = this.helperDateService.create();
                const [sessions, devices] = await Promise.all([
                    this.sessionAnalyticService.getCountActive(now),
                    this.deviceAnalyticService.getCountOwnerships(),
                ]);

                return {
                    sessions,
                    devices,
                    ratio: devices === 0 ? 0 : sessions / devices,
                };
            }
        );
    }

    async devicesPerUser(): Promise<IAnalyticBucketsResult> {
        const metric = EnumAnalyticDashboardMetric.devicesPerUser;
        const key = this.dashboardKey(metric, null, null);

        return this.cacheService.readThrough(
            key,
            AnalyticBucketsResultCacheSchema,
            this.analyticCache.dashboardTtlInMs,
            async () => {
                const rows = await this.deviceAnalyticService.getCountPerUser();

                const buckets = this.toBucketsByCountRange(rows);

                return { buckets };
            }
        );
    }

    async devicesInactivity(): Promise<IAnalyticMetricCount> {
        const metric = EnumAnalyticDashboardMetric.devicesInactivity;
        const key = this.dashboardKey(metric, null, null);

        return this.cacheService.readThrough(
            key,
            AnalyticMetricCountCacheSchema,
            this.analyticCache.dashboardTtlInMs,
            async () => {
                const now = this.helperDateService.create();
                const before = this.helperDateService.backward(
                    now,
                    Duration.fromMillis(this.deviceInactivityInMs)
                );
                const count =
                    await this.deviceAnalyticService.getCountInactive(before);

                return { count };
            }
        );
    }

    async apiKeysLifecycle(
        startDate: Date,
        endDate: Date
    ): Promise<IAnalyticApiKeyLifecycle> {
        const metric = EnumAnalyticDashboardMetric.apiKeysLifecycle;
        const key = this.dashboardKey(metric, startDate, endDate);

        return this.cacheService.readThrough(
            key,
            AnalyticApiKeyLifecycleCacheSchema,
            this.analyticCache.dashboardTtlInMs,
            async () => {
                const [created, reset, updated, deleted] = await Promise.all([
                    this.activityLogAnalyticService.getCountByActionsInRange(
                        [EnumActivityLogAction.adminApiKeyCreate],
                        startDate,
                        endDate
                    ),
                    this.activityLogAnalyticService.getCountByActionsInRange(
                        [EnumActivityLogAction.adminApiKeyReset],
                        startDate,
                        endDate
                    ),
                    this.activityLogAnalyticService.getCountByActionsInRange(
                        [
                            EnumActivityLogAction.adminApiKeyUpdate,
                            EnumActivityLogAction.adminApiKeyUpdateDate,
                            EnumActivityLogAction.adminApiKeyUpdateStatus,
                        ],
                        startDate,
                        endDate
                    ),
                    this.activityLogAnalyticService.getCountByActionsInRange(
                        [EnumActivityLogAction.adminApiKeyDelete],
                        startDate,
                        endDate
                    ),
                ]);

                return { created, reset, updated, deleted };
            }
        );
    }

    async apiKeysActiveExpired(): Promise<IAnalyticApiKeyActiveExpired> {
        const metric = EnumAnalyticDashboardMetric.apiKeysActiveExpired;
        const key = this.dashboardKey(metric, null, null);

        return this.cacheService.readThrough(
            key,
            AnalyticApiKeyActiveExpiredCacheSchema,
            this.analyticCache.dashboardTtlInMs,
            async () => {
                const now = this.helperDateService.create();

                return await this.apiKeyAnalyticService.getActiveExpired(now);
            }
        );
    }

    async apiKeysTypeMix(): Promise<IAnalyticBucketsResult> {
        const metric = EnumAnalyticDashboardMetric.apiKeysTypeMix;
        const key = this.dashboardKey(metric, null, null);

        return this.cacheService.readThrough(
            key,
            AnalyticBucketsResultCacheSchema,
            this.analyticCache.dashboardTtlInMs,
            async () => {
                const rows = await this.apiKeyAnalyticService.getTypeMix();

                return { buckets: rows };
            }
        );
    }

    async termPoliciesAcceptanceRate(
        startDate: Date | null,
        endDate: Date | null
    ): Promise<IAnalyticTermPolicyAcceptanceRate> {
        const metric = EnumAnalyticDashboardMetric.termPoliciesAcceptance;
        const key = this.dashboardKey(metric, startDate, endDate);

        return this.cacheService.readThrough(
            key,
            AnalyticTermPolicyAcceptanceRateCacheSchema,
            this.analyticCache.dashboardTtlInMs,
            async () => {
                const activeUserCount =
                    await this.userAnalyticService.getCountActive();

                return await this.termPolicyAcceptanceAnalyticService.getAcceptanceRate(
                    activeUserCount,
                    startDate,
                    endDate
                );
            }
        );
    }

    async termPoliciesTimeToAccept(
        startDate: Date | null,
        endDate: Date | null
    ): Promise<IAnalyticTermPolicyTimeToAccept> {
        const metric = EnumAnalyticDashboardMetric.termPoliciesTimeToAccept;
        const key = this.dashboardKey(metric, startDate, endDate);

        return this.cacheService.readThrough(
            key,
            AnalyticTermPolicyTimeToAcceptCacheSchema,
            this.analyticCache.dashboardTtlInMs,
            () =>
                this.termPolicyAcceptanceAnalyticService.getTimeToAccept(
                    startDate,
                    endDate
                )
        );
    }

    async workspacesCreation(
        startDate: Date,
        endDate: Date
    ): Promise<IAnalyticMetricCount> {
        const metric = EnumAnalyticDashboardMetric.workspacesCreation;
        const key = this.dashboardKey(metric, startDate, endDate);

        return this.cacheService.readThrough(
            key,
            AnalyticMetricCountCacheSchema,
            this.analyticCache.dashboardTtlInMs,
            async () => {
                const count =
                    await this.workspaceAnalyticService.getCountCreated(
                        startDate,
                        endDate
                    );

                return { count };
            }
        );
    }

    async workspacesVisibility(): Promise<IAnalyticBucketsResult> {
        const metric = EnumAnalyticDashboardMetric.workspacesVisibility;
        const key = this.dashboardKey(metric, null, null);

        return this.cacheService.readThrough(
            key,
            AnalyticBucketsResultCacheSchema,
            this.analyticCache.dashboardTtlInMs,
            async () => {
                const rows =
                    await this.workspaceAnalyticService.getGroupByVisibility();

                return { buckets: rows };
            }
        );
    }

    async workspacesInviteFunnel(
        startDate: Date,
        endDate: Date
    ): Promise<IAnalyticStatusCount[]> {
        const metric = EnumAnalyticDashboardMetric.workspacesInviteFunnel;
        const key = this.dashboardKey(metric, startDate, endDate);

        return this.cacheService.readThrough(
            key,
            AnalyticStatusCountsCacheSchema,
            this.analyticCache.dashboardTtlInMs,
            () =>
                this.workspaceInviteAnalyticService.getFunnel(
                    startDate,
                    endDate,
                    null
                )
        );
    }

    async workspacesJoinOutcomes(
        startDate: Date,
        endDate: Date
    ): Promise<IAnalyticStatusCount[]> {
        const metric = EnumAnalyticDashboardMetric.workspacesJoinOutcomes;
        const key = this.dashboardKey(metric, startDate, endDate);

        return this.cacheService.readThrough(
            key,
            AnalyticStatusCountsCacheSchema,
            this.analyticCache.dashboardTtlInMs,
            () =>
                this.workspaceJoinRequestAnalyticService.getOutcomes(
                    startDate,
                    endDate,
                    null
                )
        );
    }

    async workspacesMembership(
        params: IPaginationQueryOffsetParams
    ): Promise<IResponsePaginationReturn<IAnalyticWorkspaceCount>> {
        const key = this.dashboardPageKey(
            EnumAnalyticDashboardMetric.workspacesMembership,
            null,
            null,
            params.skip,
            params.limit
        );

        return this.cacheService.readThrough<
            IResponsePaginationReturn<IAnalyticWorkspaceCount>,
            IResponsePaginationReturn<IAnalyticWorkspaceCount>
        >(
            key,
            AnalyticWorkspaceCountPageCacheSchema,
            this.analyticCache.dashboardTtlInMs,
            () =>
                this.workspaceMemberAnalyticService.getMembershipDistributionOffset(
                    params
                )
        );
    }

    async workspacesActivityVolume(
        startDate: Date,
        endDate: Date,
        params: IPaginationQueryOffsetParams
    ): Promise<IResponsePaginationReturn<IAnalyticWorkspaceCount>> {
        const key = this.dashboardPageKey(
            EnumAnalyticDashboardMetric.workspacesActivity,
            startDate,
            endDate,
            params.skip,
            params.limit
        );

        return this.cacheService.readThrough<
            IResponsePaginationReturn<IAnalyticWorkspaceCount>,
            IResponsePaginationReturn<IAnalyticWorkspaceCount>
        >(
            key,
            AnalyticWorkspaceCountPageCacheSchema,
            this.analyticCache.dashboardTtlInMs,
            () =>
                this.activityLogAnalyticService.getGroupActivityByWorkspaceOffset(
                    startDate,
                    endDate,
                    params
                )
        );
    }

    async projectsCreation(
        startDate: Date,
        endDate: Date
    ): Promise<IAnalyticProjectCreation> {
        const metric = EnumAnalyticDashboardMetric.projectsCreation;
        const key = this.dashboardKey(metric, startDate, endDate);

        return this.cacheService.readThrough(
            key,
            AnalyticProjectCreationCacheSchema,
            this.analyticCache.dashboardTtlInMs,
            () => this.projectAnalyticService.getCreation(startDate, endDate)
        );
    }

    async projectsMembership(
        params: IPaginationQueryOffsetParams
    ): Promise<IResponsePaginationReturn<IAnalyticProjectCount>> {
        const key = this.dashboardPageKey(
            EnumAnalyticDashboardMetric.projectsMembership,
            null,
            null,
            params.skip,
            params.limit
        );

        return this.cacheService.readThrough<
            IResponsePaginationReturn<IAnalyticProjectCount>,
            IResponsePaginationReturn<IAnalyticProjectCount>
        >(
            key,
            AnalyticProjectCountPageCacheSchema,
            this.analyticCache.dashboardTtlInMs,
            () =>
                this.projectMemberAnalyticService.getMembershipDistributionOffset(
                    params
                )
        );
    }
}
