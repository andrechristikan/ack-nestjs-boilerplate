import { HelperDateService } from '@common/helper/services/helper.date.service';
import type { IPaginationQueryOffsetParams } from '@common/pagination/interfaces/pagination.interface';
import type { IResponsePaginationReturn } from '@common/response/interfaces/response.interface';
import { ActivityLogAnalyticDomain } from '@modules/activity-log/domains/activity-log.analytic.domain';
import { AnalyticCache } from '@modules/analytic/caches/analytic.cache';
import type {
    IAnalyticApiKeyActiveExpired,
    IAnalyticApiKeyLifecycle,
    IAnalyticBlockedUsers,
    IAnalyticBucketsResult,
    IAnalyticForgotPasswordConversion,
    IAnalyticLockoutMetrics,
    IAnalyticMetricCount,
    IAnalyticMetricRate,
    IAnalyticMobileChurn,
    IAnalyticPasswordExpiry,
    IAnalyticProjectCount,
    IAnalyticProjectCreation,
    IAnalyticSessionDeviceRatio,
    IAnalyticStatusCount,
    IAnalyticTermPolicyAcceptanceRate,
    IAnalyticTermPolicyTimeToAccept,
    IAnalyticTwoFactorAdoption,
    IAnalyticTwoFactorAttemptSnapshot,
    IAnalyticVerificationFunnels,
    IAnalyticWorkspaceCount,
} from '@modules/analytic/interfaces/analytic.interface';
import { AnalyticDateUtil } from '@modules/analytic/utils/analytic.date.util';
import { ApiKeyAnalyticDomain } from '@modules/api-key/domains/api-key.analytic.domain';
import { DeviceAnalyticDomain } from '@modules/device/domains/device.analytic.domain';
import { ProjectAnalyticDomain } from '@modules/project/domains/project.analytic.domain';
import { ProjectMemberAnalyticDomain } from '@modules/project/domains/project.member.analytic.domain';
import { SessionAnalyticDomain } from '@modules/session/domains/session.analytic.domain';
import { TermPolicyAcceptanceAnalyticDomain } from '@modules/term-policy/domains/term-policy.acceptance.analytic.domain';
import { UserAnalyticDomain } from '@modules/user/domains/user.analytic.domain';
import { UserForgotPasswordAnalyticDomain } from '@modules/user/domains/user.forgot-password.analytic.domain';
import { UserLoginAnalyticDomain } from '@modules/user/domains/user.login.analytic.domain';
import { UserMobileNumberAnalyticDomain } from '@modules/user/domains/user.mobile-number.analytic.domain';
import { UserPasswordAnalyticDomain } from '@modules/user/domains/user.password.analytic.domain';
import { UserTwoFactorAnalyticDomain } from '@modules/user/domains/user.two-factor.analytic.domain';
import { UserVerificationAnalyticDomain } from '@modules/user/domains/user.verification.analytic.domain';
import { WorkspaceAnalyticDomain } from '@modules/workspace/domains/workspace.analytic.domain';
import { WorkspaceInviteAnalyticDomain } from '@modules/workspace/domains/workspace.invite.analytic.domain';
import { WorkspaceJoinRequestAnalyticDomain } from '@modules/workspace/domains/workspace.join-request.analytic.domain';
import { WorkspaceMemberAnalyticDomain } from '@modules/workspace/domains/workspace.member.analytic.domain';
import { Injectable } from '@nestjs/common';
import {
    EnumActivityLogAction,
    EnumUserStatus,
    EnumVerificationType,
} from '@generated/prisma-client/client';
import type { Prisma } from '@generated/prisma-client/client';
import { Duration } from 'luxon';

@Injectable()
export class AnalyticDashboardDomain {
    constructor(
        private readonly analyticCache: AnalyticCache,
        private readonly analyticDateUtil: AnalyticDateUtil,
        private readonly helperDateService: HelperDateService,
        private readonly userAnalyticDomain: UserAnalyticDomain,
        private readonly userLoginAnalyticDomain: UserLoginAnalyticDomain,
        private readonly userPasswordAnalyticDomain: UserPasswordAnalyticDomain,
        private readonly userForgotPasswordAnalyticDomain: UserForgotPasswordAnalyticDomain,
        private readonly userTwoFactorAnalyticDomain: UserTwoFactorAnalyticDomain,
        private readonly userVerificationAnalyticDomain: UserVerificationAnalyticDomain,
        private readonly userMobileNumberAnalyticDomain: UserMobileNumberAnalyticDomain,
        private readonly activityLogAnalyticDomain: ActivityLogAnalyticDomain,
        private readonly sessionAnalyticDomain: SessionAnalyticDomain,
        private readonly deviceAnalyticDomain: DeviceAnalyticDomain,
        private readonly apiKeyAnalyticDomain: ApiKeyAnalyticDomain,
        private readonly termPolicyAcceptanceAnalyticDomain: TermPolicyAcceptanceAnalyticDomain,
        private readonly workspaceAnalyticDomain: WorkspaceAnalyticDomain,
        private readonly workspaceInviteAnalyticDomain: WorkspaceInviteAnalyticDomain,
        private readonly workspaceJoinRequestAnalyticDomain: WorkspaceJoinRequestAnalyticDomain,
        private readonly workspaceMemberAnalyticDomain: WorkspaceMemberAnalyticDomain,
        private readonly projectAnalyticDomain: ProjectAnalyticDomain,
        private readonly projectMemberAnalyticDomain: ProjectMemberAnalyticDomain
    ) {}

    private pageToken(params: IPaginationQueryOffsetParams<unknown>): string {
        const page = Math.floor(params.skip / params.limit) + 1;

        return `page=${page}:perPage=${params.limit}`;
    }

    private async cached<T>(
        metric: string,
        start: Date | undefined,
        end: Date | undefined,
        compute: () => Promise<T>
    ): Promise<T> {
        const s = this.analyticDateUtil.cacheToken(start);
        const e = this.analyticDateUtil.cacheToken(end);
        const hit = await this.analyticCache.getDashboard<T>(metric, s, e);
        if (hit) {
            return hit;
        }
        const value = await compute();
        await this.analyticCache.setDashboard(metric, s, e, value);
        return value;
    }

    usersRegistrations(
        startDate: Date,
        endDate: Date
    ): Promise<IAnalyticMetricCount> {
        return this.cached(
            'users.registrations',
            startDate,
            endDate,
            async () => {
                const count = await this.userAnalyticDomain.countRegistrations(
                    startDate,
                    endDate
                );

                return { count };
            }
        );
    }

    usersChurn(startDate: Date, endDate: Date): Promise<IAnalyticMetricRate> {
        return this.cached('users.churn', startDate, endDate, () =>
            this.userAnalyticDomain.churnRate(startDate, endDate)
        );
    }

    usersBlocked(
        startDate: Date,
        endDate: Date
    ): Promise<IAnalyticBlockedUsers> {
        return this.cached('users.blocked', startDate, endDate, async () => {
            const [trend, current] = await Promise.all([
                this.activityLogAnalyticDomain.countByActionsInRange(
                    [EnumActivityLogAction.userBlocked],
                    startDate,
                    endDate
                ),
                this.userAnalyticDomain.countByStatus(EnumUserStatus.blocked),
            ]);
            return { trend, current };
        });
    }

    usersSignUpWith(
        startDate?: Date,
        endDate?: Date
    ): Promise<IAnalyticBucketsResult> {
        return this.cached('users.signUpWith', startDate, endDate, async () => {
            const rows = await this.userAnalyticDomain.groupBySignUpWith(
                startDate,
                endDate
            );
            return {
                buckets: rows.map(r => ({
                    key: String(r.key),
                    count: r.count,
                })),
            };
        });
    }

    usersSignUpFrom(
        startDate?: Date,
        endDate?: Date
    ): Promise<IAnalyticBucketsResult> {
        return this.cached('users.signUpFrom', startDate, endDate, async () => {
            const rows = await this.userAnalyticDomain.groupBySignUpFrom(
                startDate,
                endDate
            );
            return {
                buckets: rows.map(r => ({
                    key: String(r.key),
                    count: r.count,
                })),
            };
        });
    }

    usersEmailVerification(
        startDate?: Date,
        endDate?: Date
    ): Promise<IAnalyticMetricRate> {
        return this.cached('users.emailVerification', startDate, endDate, () =>
            this.userAnalyticDomain.emailVerificationRate()
        );
    }

    usersMobileVerification(
        startDate?: Date,
        endDate?: Date
    ): Promise<IAnalyticMetricRate> {
        return this.cached('users.mobileVerification', startDate, endDate, () =>
            this.userMobileNumberAnalyticDomain.verificationRate()
        );
    }

    usersStatusDistribution(): Promise<IAnalyticBucketsResult> {
        return this.cached('users.status', undefined, undefined, async () => {
            const rows = await this.userAnalyticDomain.groupByStatus();
            return {
                buckets: rows.map(r => ({
                    key: String(r.key),
                    count: r.count,
                })),
            };
        });
    }

    usersCountryDistribution(): Promise<IAnalyticBucketsResult> {
        return this.cached('users.country', undefined, undefined, async () => {
            const rows = await this.userAnalyticDomain.groupByCountry();
            return { buckets: rows };
        });
    }

    usersRoleDistribution(): Promise<IAnalyticBucketsResult> {
        return this.cached('users.role', undefined, undefined, async () => {
            const rows = await this.userAnalyticDomain.groupByRole();
            return { buckets: rows };
        });
    }

    usersSelfDelete(
        startDate: Date,
        endDate: Date
    ): Promise<IAnalyticMetricCount> {
        return this.cached('users.selfDelete', startDate, endDate, async () => {
            const count =
                await this.activityLogAnalyticDomain.countByActionsInRange(
                    [EnumActivityLogAction.userDeleteSelf],
                    startDate,
                    endDate
                );

            return { count };
        });
    }

    usersClaimUsername(
        startDate: Date,
        endDate: Date
    ): Promise<IAnalyticMetricCount> {
        return this.cached(
            'users.claimUsername',
            startDate,
            endDate,
            async () => {
                const count =
                    await this.activityLogAnalyticDomain.countByActionsInRange(
                        [EnumActivityLogAction.userClaimUsername],
                        startDate,
                        endDate
                    );

                return { count };
            }
        );
    }

    usersMobileChurn(
        startDate: Date,
        endDate: Date
    ): Promise<IAnalyticMobileChurn> {
        return this.cached('users.mobileChurn', startDate, endDate, () =>
            this.userMobileNumberAnalyticDomain.churn(startDate, endDate)
        );
    }

    authLoginFrequency(
        startDate: Date,
        endDate: Date
    ): Promise<IAnalyticMetricCount> {
        return this.cached(
            'auth.loginFrequency',
            startDate,
            endDate,
            async () => {
                const count = await this.userLoginAnalyticDomain.loginFrequency(
                    startDate,
                    endDate
                );

                return { count };
            }
        );
    }

    authLoginMethod(
        startDate?: Date,
        endDate?: Date
    ): Promise<IAnalyticBucketsResult> {
        return this.cached('auth.loginMethod', startDate, endDate, async () => {
            const rows = await this.userLoginAnalyticDomain.loginMethodMix(
                startDate ?? null,
                endDate ?? null
            );
            return {
                buckets: rows.map(r => ({
                    key: r.action,
                    count: r.count,
                })),
            };
        });
    }

    authLoginSource(
        startDate?: Date,
        endDate?: Date
    ): Promise<IAnalyticBucketsResult> {
        return this.authLoginMethod(startDate, endDate);
    }

    authLockout(
        startDate: Date,
        endDate: Date
    ): Promise<IAnalyticLockoutMetrics> {
        return this.cached('auth.lockout', startDate, endDate, () =>
            this.userLoginAnalyticDomain.lockoutMetrics(startDate, endDate)
        );
    }

    authSessionRevoke(
        startDate: Date,
        endDate: Date
    ): Promise<IAnalyticMetricCount> {
        return this.cached(
            'auth.sessionRevoke',
            startDate,
            endDate,
            async () => {
                const count =
                    await this.activityLogAnalyticDomain.countByActionsInRange(
                        [
                            EnumActivityLogAction.userRevokeSession,
                            EnumActivityLogAction.userRevokeSessionByAdmin,
                            EnumActivityLogAction.userRevokeAllSessions,
                            EnumActivityLogAction.userRevokeAllSessionsByAdmin,
                        ],
                        startDate,
                        endDate
                    );

                return { count };
            }
        );
    }

    authConcurrentSessions(): Promise<IAnalyticBucketsResult> {
        return this.cached(
            'auth.concurrent',
            undefined,
            undefined,
            async () => {
                const rows =
                    await this.sessionAnalyticDomain.countActiveByUser();
                return {
                    buckets: rows.map(r => ({
                        key: r.userId,
                        count: r.count,
                    })),
                };
            }
        );
    }

    authSessionsGeo(
        startDate?: Date,
        endDate?: Date
    ): Promise<IAnalyticBucketsResult> {
        return this.cached('auth.sessionsGeo', startDate, endDate, async () => {
            const rows = await this.sessionAnalyticDomain.groupByCountry(
                startDate,
                endDate
            );
            return { buckets: rows };
        });
    }

    authSessionsUserAgent(
        startDate?: Date,
        endDate?: Date
    ): Promise<IAnalyticBucketsResult> {
        return this.cached('auth.sessionsUa', startDate, endDate, async () => {
            const sessions =
                await this.sessionAnalyticDomain.findActiveWithGeoInRange(
                    startDate,
                    endDate
                );
            const map = new Map<string, number>();
            for (const s of sessions) {
                const key =
                    s.userAgent?.browser?.name ??
                    s.userAgent?.os?.name ??
                    'unknown';
                map.set(key, (map.get(key) ?? 0) + 1);
            }
            return {
                buckets: [...map.entries()].map(([key, count]) => ({
                    key,
                    count,
                })),
            };
        });
    }

    authRefreshTokenVolume(
        startDate: Date,
        endDate: Date
    ): Promise<IAnalyticMetricCount> {
        return this.cached('auth.refresh', startDate, endDate, async () => {
            const count =
                await this.activityLogAnalyticDomain.countByActionsInRange(
                    [EnumActivityLogAction.userRefreshToken],
                    startDate,
                    endDate
                );

            return { count };
        });
    }

    authLogoutRate(
        startDate: Date,
        endDate: Date
    ): Promise<IAnalyticMetricCount> {
        return this.cached('auth.logout', startDate, endDate, async () => {
            const count =
                await this.activityLogAnalyticDomain.countByActionsInRange(
                    [EnumActivityLogAction.userLogout],
                    startDate,
                    endDate
                );

            return { count };
        });
    }

    authVerificationFunnel(
        startDate: Date,
        endDate: Date
    ): Promise<IAnalyticVerificationFunnels> {
        return this.cached(
            'auth.verificationFunnel',
            startDate,
            endDate,
            async () => {
                const [email, mobile] = await Promise.all([
                    this.userVerificationAnalyticDomain.funnel(
                        EnumVerificationType.email,
                        startDate,
                        endDate
                    ),
                    this.userVerificationAnalyticDomain.funnel(
                        EnumVerificationType.mobileNumber,
                        startDate,
                        endDate
                    ),
                ]);
                return { email, mobile };
            }
        );
    }

    authPasswordExpiry(): Promise<IAnalyticPasswordExpiry> {
        return this.cached('auth.passwordExpiry', undefined, undefined, () =>
            this.userPasswordAnalyticDomain.passwordExpiryCompliance()
        );
    }

    authPasswordChange(
        startDate: Date,
        endDate: Date
    ): Promise<IAnalyticMetricCount> {
        return this.cached(
            'auth.passwordChange',
            startDate,
            endDate,
            async () => {
                const count =
                    await this.userPasswordAnalyticDomain.passwordChangeCount(
                        startDate,
                        endDate
                    );

                return { count };
            }
        );
    }

    authForgotPasswordConversion(
        startDate: Date,
        endDate: Date
    ): Promise<IAnalyticForgotPasswordConversion> {
        return this.cached('auth.forgotConversion', startDate, endDate, () =>
            this.userForgotPasswordAnalyticDomain.conversion(startDate, endDate)
        );
    }

    authAdminForcePassword(
        startDate: Date,
        endDate: Date
    ): Promise<IAnalyticMetricCount> {
        return this.cached(
            'auth.adminForcePassword',
            startDate,
            endDate,
            async () => {
                const count =
                    await this.userPasswordAnalyticDomain.adminForcePasswordCount(
                        startDate,
                        endDate
                    );

                return { count };
            }
        );
    }

    authTwoFactorAdoption(): Promise<IAnalyticTwoFactorAdoption> {
        return this.cached('auth.twoFactorAdoption', undefined, undefined, () =>
            this.userTwoFactorAnalyticDomain.adoption()
        );
    }

    authTwoFactorAdminReset(
        startDate: Date,
        endDate: Date
    ): Promise<IAnalyticMetricCount> {
        return this.cached(
            'auth.twoFactorAdminReset',
            startDate,
            endDate,
            async () => {
                const count =
                    await this.userTwoFactorAnalyticDomain.adminResetCount(
                        startDate,
                        endDate
                    );

                return { count };
            }
        );
    }

    authTwoFactorVerifySuccess(
        startDate: Date,
        endDate: Date
    ): Promise<IAnalyticMetricCount> {
        return this.cached(
            'auth.twoFactorVerify',
            startDate,
            endDate,
            async () => {
                const count =
                    await this.userTwoFactorAnalyticDomain.verifySuccessCount(
                        startDate,
                        endDate
                    );

                return { count };
            }
        );
    }

    authBackupCodeRegeneration(
        startDate: Date,
        endDate: Date
    ): Promise<IAnalyticMetricCount> {
        return this.cached(
            'auth.backupCodeRegeneration',
            startDate,
            endDate,
            async () => {
                const count =
                    await this.userTwoFactorAnalyticDomain.backupCodeRegenerationCount(
                        startDate,
                        endDate
                    );

                return { count };
            }
        );
    }

    authTwoFactorAttempt(): Promise<IAnalyticTwoFactorAttemptSnapshot> {
        return this.cached('auth.twoFactorAttempt', undefined, undefined, () =>
            this.userTwoFactorAnalyticDomain.attemptSnapshot()
        );
    }

    devicesRegistration(
        startDate: Date,
        endDate: Date
    ): Promise<IAnalyticMetricCount> {
        return this.cached(
            'devices.registration',
            startDate,
            endDate,
            async () => {
                const count =
                    await this.deviceAnalyticDomain.countRegistrations(
                        startDate,
                        endDate
                    );

                return { count };
            }
        );
    }

    devicesPlatform(): Promise<IAnalyticBucketsResult> {
        return this.cached(
            'devices.platform',
            undefined,
            undefined,
            async () => {
                const rows = await this.deviceAnalyticDomain.groupByPlatform();
                return { buckets: rows };
            }
        );
    }

    devicesPushToken(): Promise<IAnalyticMetricRate> {
        return this.cached('devices.pushToken', undefined, undefined, () =>
            this.deviceAnalyticDomain.pushTokenRate()
        );
    }

    devicesInfoRefresh(
        startDate: Date,
        endDate: Date
    ): Promise<IAnalyticMetricCount> {
        return this.cached(
            'devices.infoRefresh',
            startDate,
            endDate,
            async () => {
                const count =
                    await this.activityLogAnalyticDomain.countByActionsInRange(
                        [EnumActivityLogAction.userDeviceRefresh],
                        startDate,
                        endDate
                    );

                return { count };
            }
        );
    }

    devicesSessionRatio(): Promise<IAnalyticSessionDeviceRatio> {
        return this.cached(
            'devices.sessionRatio',
            undefined,
            undefined,
            async () => {
                const [sessions, devices] = await Promise.all([
                    this.sessionAnalyticDomain.countActive(),
                    this.deviceAnalyticDomain.countOwnerships(),
                ]);
                return {
                    sessions,
                    devices,
                    ratio: devices === 0 ? 0 : sessions / devices,
                };
            }
        );
    }

    devicesPerUser(): Promise<IAnalyticBucketsResult> {
        return this.cached(
            'devices.perUser',
            undefined,
            undefined,
            async () => {
                const rows = await this.deviceAnalyticDomain.countPerUser();
                return {
                    buckets: rows.map(r => ({
                        key: r.userId,
                        count: r.count,
                    })),
                };
            }
        );
    }

    devicesInactivity(): Promise<IAnalyticMetricCount> {
        return this.cached(
            'devices.inactivity',
            undefined,
            undefined,
            async () => {
                const now = this.helperDateService.create();
                const before = this.helperDateService.backward(
                    now,
                    Duration.fromObject({ days: 30 })
                );
                const rows =
                    await this.deviceAnalyticDomain.findInactive(before);
                return { count: rows.length };
            }
        );
    }

    apiKeysLifecycle(
        startDate: Date,
        endDate: Date
    ): Promise<IAnalyticApiKeyLifecycle> {
        return this.cached('apiKeys.lifecycle', startDate, endDate, () =>
            this.apiKeyAnalyticDomain.lifecycle(startDate, endDate)
        );
    }

    apiKeysActiveExpired(): Promise<IAnalyticApiKeyActiveExpired> {
        return this.cached('apiKeys.activeExpired', undefined, undefined, () =>
            this.apiKeyAnalyticDomain.activeExpired()
        );
    }

    apiKeysTypeMix(): Promise<IAnalyticBucketsResult> {
        return this.cached(
            'apiKeys.typeMix',
            undefined,
            undefined,
            async () => {
                const rows = await this.apiKeyAnalyticDomain.typeMix();
                return { buckets: rows };
            }
        );
    }

    termPoliciesAcceptanceRate(
        startDate?: Date,
        endDate?: Date
    ): Promise<IAnalyticTermPolicyAcceptanceRate> {
        return this.cached('termPolicies.acceptance', startDate, endDate, () =>
            this.termPolicyAcceptanceAnalyticDomain.acceptanceRate(
                startDate ?? null,
                endDate ?? null
            )
        );
    }

    termPoliciesTimeToAccept(
        startDate?: Date,
        endDate?: Date
    ): Promise<IAnalyticTermPolicyTimeToAccept> {
        return this.cached(
            'termPolicies.timeToAccept',
            startDate,
            endDate,
            () =>
                this.termPolicyAcceptanceAnalyticDomain.timeToAccept(
                    startDate ?? null,
                    endDate ?? null
                )
        );
    }

    workspacesCreation(
        startDate: Date,
        endDate: Date
    ): Promise<IAnalyticMetricCount> {
        return this.cached(
            'workspaces.creation',
            startDate,
            endDate,
            async () => {
                const count = await this.workspaceAnalyticDomain.countCreated(
                    startDate,
                    endDate
                );

                return { count };
            }
        );
    }

    workspacesVisibility(): Promise<IAnalyticBucketsResult> {
        return this.cached(
            'workspaces.visibility',
            undefined,
            undefined,
            async () => {
                const rows =
                    await this.workspaceAnalyticDomain.groupByVisibility();
                return { buckets: rows };
            }
        );
    }

    workspacesInviteFunnel(
        startDate: Date,
        endDate: Date
    ): Promise<IAnalyticStatusCount[]> {
        return this.cached('workspaces.inviteFunnel', startDate, endDate, () =>
            this.workspaceInviteAnalyticDomain.funnel(startDate, endDate, null)
        );
    }

    workspacesJoinOutcomes(
        startDate: Date,
        endDate: Date
    ): Promise<IAnalyticStatusCount[]> {
        return this.cached('workspaces.joinOutcomes', startDate, endDate, () =>
            this.workspaceJoinRequestAnalyticDomain.outcomes(
                startDate,
                endDate,
                null
            )
        );
    }

    workspacesMembership(
        params: IPaginationQueryOffsetParams<Prisma.WorkspaceMemberWhereInput>
    ): Promise<IResponsePaginationReturn<IAnalyticWorkspaceCount>> {
        const token = this.pageToken(params);
        const metric = `workspaces.membership:${token}`;

        return this.cached(metric, undefined, undefined, () =>
            this.workspaceMemberAnalyticDomain.membershipDistributionOffset(
                params
            )
        );
    }

    workspacesActivityVolume(
        startDate: Date,
        endDate: Date,
        params: IPaginationQueryOffsetParams<Prisma.ActivityLogWhereInput>
    ): Promise<IResponsePaginationReturn<IAnalyticWorkspaceCount>> {
        const token = this.pageToken(params);
        const metric = `workspaces.activity:${token}`;

        return this.cached(metric, startDate, endDate, () =>
            this.activityLogAnalyticDomain.groupActivityByWorkspaceOffset(
                startDate,
                endDate,
                params
            )
        );
    }

    projectsCreation(
        startDate: Date,
        endDate: Date
    ): Promise<IAnalyticProjectCreation> {
        return this.cached('projects.creation', startDate, endDate, () =>
            this.projectAnalyticDomain.creation(startDate, endDate)
        );
    }

    projectsMembership(
        params: IPaginationQueryOffsetParams<Prisma.ProjectMemberWhereInput>
    ): Promise<IResponsePaginationReturn<IAnalyticProjectCount>> {
        const token = this.pageToken(params);
        const metric = `projects.membership:${token}`;

        return this.cached(metric, undefined, undefined, () =>
            this.projectMemberAnalyticDomain.membershipDistributionOffset(
                params
            )
        );
    }
}
