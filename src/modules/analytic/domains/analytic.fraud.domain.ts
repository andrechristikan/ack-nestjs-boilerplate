import { HelperDateService } from '@common/helper/services/helper.date.service';
import type { IPaginationQueryOffsetParams } from '@common/pagination/interfaces/pagination.interface';
import { PaginationService } from '@common/pagination/services/pagination.service';
import type { IResponsePaginationReturn } from '@common/response/interfaces/response.interface';
import { ActivityLogAnalyticDomain } from '@modules/activity-log/domains/activity-log.analytic.domain';
import { AnalyticCache } from '@modules/analytic/caches/analytic.cache';
import {
    AnalyticAccountTakeoverAvailableOrderBy,
    AnalyticBackupCodeNewDeviceAvailableOrderBy,
    AnalyticCredentialStuffingAvailableOrderBy,
    AnalyticForgotPasswordAbuseAvailableOrderBy,
    AnalyticFraudRiskScoreAvailableOrderBy,
    AnalyticKeyCountAvailableOrderBy,
    AnalyticSessionAfterAdminAvailableOrderBy,
    AnalyticSharedFingerprintAvailableOrderBy,
    AnalyticUserCountAvailableOrderBy,
} from '@modules/analytic/constants/analytic.list.constant';
import type {
    IAnalyticAccountTakeover,
    IAnalyticApiKeyBurst,
    IAnalyticBackupCodeNewDevice,
    IAnalyticCredentialStuffing,
    IAnalyticForgotPasswordAbuse,
    IAnalyticFraudRiskScore,
    IAnalyticFraudSummary,
    IAnalyticMassRegistration,
    IAnalyticPasswordResetEnumeration,
    IAnalyticRefreshSpike,
    IAnalyticSessionAfterAdmin,
    IAnalyticSharedFingerprint,
} from '@modules/analytic/interfaces/analytic.interface';
import { AnalyticDateUtil } from '@modules/analytic/utils/analytic.date.util';
import { AnalyticSortUtil } from '@modules/analytic/utils/analytic.sort.util';
import { DeviceAnalyticDomain } from '@modules/device/domains/device.analytic.domain';
import { UserAnalyticDomain } from '@modules/user/domains/user.analytic.domain';
import { UserForgotPasswordAnalyticDomain } from '@modules/user/domains/user.forgot-password.analytic.domain';
import { UserLoginAnalyticDomain } from '@modules/user/domains/user.login.analytic.domain';
import { UserNotFoundException } from '@modules/user/exceptions/user.not-found.exception';
import { UserPasswordAnalyticDomain } from '@modules/user/domains/user.password.analytic.domain';
import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { EnumActivityLogAction, Prisma } from '@generated/prisma-client/client';
import { Duration } from 'luxon';

@Injectable()
export class AnalyticFraudDomain {
    private readonly credentialStuffingWindowInMs: number;
    private readonly credentialStuffingMinUniqueAccounts: number;
    private readonly accountTakeoverNewDeviceAfterPasswordChangeInMs: number;
    private readonly massRegistrationWindowInMs: number;
    private readonly massRegistrationMinAccountsPerIp: number;
    private readonly passwordResetEnumerationWindowInMs: number;
    private readonly passwordResetEnumerationMinRequestsPerIp: number;
    private readonly sharedFingerprintMinUsersPerFingerprint: number;
    private readonly sessionAfterAdminRevokeInMs: number;
    private readonly forgotPasswordTokenAbuseWindowInMs: number;
    private readonly forgotPasswordTokenAbuseMinUnusedTokens: number;
    private readonly refreshSpikeWindowInMs: number;
    private readonly refreshSpikeMinEvents: number;
    private readonly backupCodeNewDeviceWindowInMs: number;
    private readonly apiKeyBurstWindowInMs: number;
    private readonly apiKeyBurstMinEvents: number;
    private readonly weightSessionAfterAdmin: number;
    private readonly weightImpossibleTravel: number;
    private readonly weightNewDeviceAfterPasswordChange: number;
    private readonly weightCredentialStuffingIp: number;
    private readonly weightSharedFingerprint: number;
    private readonly weightNearLockout: number;
    private readonly weightMassRegistrationIp: number;
    private readonly weightForgotPasswordAbuse: number;
    private readonly passwordMaxAttempt: number;
    private readonly failedLoginSpikeNearLockoutOffset: number;
    private readonly bandMonitorMax: number;
    private readonly bandReviewMax: number;
    private readonly bandElevateMax: number;
    private readonly bandLabelMonitor: string;
    private readonly bandLabelReview: string;
    private readonly bandLabelElevate: string;
    private readonly bandLabelCritical: string;

    constructor(
        private readonly analyticCache: AnalyticCache,
        private readonly analyticDateUtil: AnalyticDateUtil,
        private readonly analyticSortUtil: AnalyticSortUtil,
        private readonly paginationService: PaginationService,
        private readonly configService: ConfigService,
        private readonly helperDateService: HelperDateService,
        private readonly activityLogAnalyticDomain: ActivityLogAnalyticDomain,
        private readonly userLoginAnalyticDomain: UserLoginAnalyticDomain,
        private readonly userAnalyticDomain: UserAnalyticDomain,
        private readonly userPasswordAnalyticDomain: UserPasswordAnalyticDomain,
        private readonly userForgotPasswordAnalyticDomain: UserForgotPasswordAnalyticDomain,
        private readonly deviceAnalyticDomain: DeviceAnalyticDomain
    ) {
        this.credentialStuffingWindowInMs = this.configService.get<number>(
            'analytic.fraud.credentialStuffing.windowInMs'
        )!;
        this.credentialStuffingMinUniqueAccounts =
            this.configService.get<number>(
                'analytic.fraud.credentialStuffing.minUniqueAccounts'
            )!;
        this.accountTakeoverNewDeviceAfterPasswordChangeInMs =
            this.configService.get<number>(
                'analytic.fraud.accountTakeover.newDeviceAfterPasswordChangeInMs'
            )!;
        this.massRegistrationWindowInMs = this.configService.get<number>(
            'analytic.fraud.massRegistration.windowInMs'
        )!;
        this.massRegistrationMinAccountsPerIp = this.configService.get<number>(
            'analytic.fraud.massRegistration.minAccountsPerIp'
        )!;
        this.passwordResetEnumerationWindowInMs =
            this.configService.get<number>(
                'analytic.fraud.passwordResetEnumeration.windowInMs'
            )!;
        this.passwordResetEnumerationMinRequestsPerIp =
            this.configService.get<number>(
                'analytic.fraud.passwordResetEnumeration.minRequestsPerIp'
            )!;
        this.sharedFingerprintMinUsersPerFingerprint =
            this.configService.get<number>(
                'analytic.fraud.sharedFingerprint.minUsersPerFingerprint'
            )!;
        this.sessionAfterAdminRevokeInMs = this.configService.get<number>(
            'analytic.fraud.sessionAfterAdmin.sessionAfterAdminRevokeInMs'
        )!;
        this.forgotPasswordTokenAbuseWindowInMs =
            this.configService.get<number>(
                'analytic.fraud.forgotPasswordTokenAbuse.windowInMs'
            )!;
        this.forgotPasswordTokenAbuseMinUnusedTokens =
            this.configService.get<number>(
                'analytic.fraud.forgotPasswordTokenAbuse.minUnusedTokens'
            )!;
        this.refreshSpikeWindowInMs = this.configService.get<number>(
            'analytic.fraud.refreshSpike.windowInMs'
        )!;
        this.refreshSpikeMinEvents = this.configService.get<number>(
            'analytic.fraud.refreshSpike.minEvents'
        )!;
        this.backupCodeNewDeviceWindowInMs = this.configService.get<number>(
            'analytic.fraud.backupCodeNewDevice.windowInMs'
        )!;
        this.apiKeyBurstWindowInMs = this.configService.get<number>(
            'analytic.fraud.apiKeyBurst.windowInMs'
        )!;
        this.apiKeyBurstMinEvents = this.configService.get<number>(
            'analytic.fraud.apiKeyBurst.minEvents'
        )!;
        this.weightSessionAfterAdmin = this.configService.get<number>(
            'analytic.fraud.weights.sessionAfterAdmin'
        )!;
        this.weightImpossibleTravel = this.configService.get<number>(
            'analytic.fraud.weights.impossibleTravel'
        )!;
        this.weightNewDeviceAfterPasswordChange =
            this.configService.get<number>(
                'analytic.fraud.weights.newDeviceAfterPasswordChange'
            )!;
        this.weightCredentialStuffingIp = this.configService.get<number>(
            'analytic.fraud.weights.credentialStuffingIp'
        )!;
        this.weightSharedFingerprint = this.configService.get<number>(
            'analytic.fraud.weights.sharedFingerprint'
        )!;
        this.weightNearLockout = this.configService.get<number>(
            'analytic.fraud.weights.nearLockout'
        )!;
        this.weightMassRegistrationIp = this.configService.get<number>(
            'analytic.fraud.weights.massRegistrationIp'
        )!;
        this.weightForgotPasswordAbuse = this.configService.get<number>(
            'analytic.fraud.weights.forgotPasswordAbuse'
        )!;
        this.passwordMaxAttempt = this.configService.get<number>(
            'auth.password.maxAttempt'
        )!;
        this.failedLoginSpikeNearLockoutOffset = this.configService.get<number>(
            'analytic.anomaly.failedLoginSpike.nearLockoutOffset'
        )!;
        this.bandMonitorMax = this.configService.get<number>(
            'analytic.fraud.bands.monitorMax'
        )!;
        this.bandReviewMax = this.configService.get<number>(
            'analytic.fraud.bands.reviewMax'
        )!;
        this.bandElevateMax = this.configService.get<number>(
            'analytic.fraud.bands.elevateMax'
        )!;
        this.bandLabelMonitor = this.configService.get<string>(
            'analytic.fraud.bandLabels.monitor'
        )!;
        this.bandLabelReview = this.configService.get<string>(
            'analytic.fraud.bandLabels.review'
        )!;
        this.bandLabelElevate = this.configService.get<string>(
            'analytic.fraud.bandLabels.elevate'
        )!;
        this.bandLabelCritical = this.configService.get<string>(
            'analytic.fraud.bandLabels.critical'
        )!;
    }

    private resolveWindow(
        windowMs: number | null,
        defaultWindowInMs: number
    ): number {
        if (windowMs) {
            return windowMs;
        }
        return defaultWindowInMs;
    }

    private resolveBand(score: number): string {
        if (score <= this.bandMonitorMax) {
            return this.bandLabelMonitor;
        }
        if (score <= this.bandReviewMax) {
            return this.bandLabelReview;
        }
        if (score <= this.bandElevateMax) {
            return this.bandLabelElevate;
        }
        return this.bandLabelCritical;
    }

    private async computeCredentialStuffing(
        windowMs: number
    ): Promise<IAnalyticCredentialStuffing[]> {
        const end = this.helperDateService.create();
        const start = this.helperDateService.backward(
            end,
            Duration.fromMillis(windowMs)
        );
        const events = await this.userLoginAnalyticDomain.getFailedLoginEvents(
            start,
            end
        );
        const map = new Map<
            string,
            { users: Set<string>; failCount: number }
        >();
        for (const e of events) {
            const ip = e.ipAddress ?? 'unknown';
            if (!map.has(ip)) {
                map.set(ip, { users: new Set(), failCount: 0 });
            }
            const row = map.get(ip)!;
            row.users.add(e.userId);
            row.failCount++;
        }
        return [...map.entries()]
            .filter(
                ([, v]) =>
                    v.users.size >= this.credentialStuffingMinUniqueAccounts
            )
            .map(([ipAddress, v]) => ({
                ipAddress,
                uniqueUsers: v.users.size,
                failCount: v.failCount,
            }));
    }

    private async computeAccountTakeover(
        startDate: Date,
        endDate: Date
    ): Promise<IAnalyticAccountTakeover[]> {
        const changes = await this.userPasswordAnalyticDomain.getProfileChanges(
            startDate,
            endDate
        );
        const flagged: IAnalyticAccountTakeover[] = [];
        for (const change of changes) {
            const windowEnd = this.helperDateService.forward(
                change.createdAt,
                Duration.fromMillis(
                    this.accountTakeoverNewDeviceAfterPasswordChangeInMs
                )
            );
            const devices = await this.deviceAnalyticDomain.getCreatedInRange(
                change.createdAt,
                windowEnd
            );
            const forUser = devices.filter(d => d.userId === change.userId);
            if (forUser.length > 0) {
                flagged.push({
                    userId: change.userId,
                    indicatorCodes: ['newDeviceAfterPasswordChange'],
                    passwordChangedAt: change.createdAt,
                });
            }
        }
        return flagged;
    }

    private async computeMassRegistration(
        windowMs: number
    ): Promise<IAnalyticMassRegistration[]> {
        const end = this.helperDateService.create();
        const start = this.helperDateService.backward(
            end,
            Duration.fromMillis(windowMs)
        );
        const users = await this.userAnalyticDomain.getSignUpsInRange(
            start,
            end
        );
        const map = new Map<string, number>();
        for (const u of users) {
            const key = String(u.signUpFrom);
            map.set(key, (map.get(key) ?? 0) + 1);
        }
        return [...map.entries()]
            .filter(
                ([, count]) => count >= this.massRegistrationMinAccountsPerIp
            )
            .map(([key, count]) => ({ key, count }));
    }

    private async computePasswordResetEnumeration(
        windowMs: number
    ): Promise<IAnalyticPasswordResetEnumeration[]> {
        const end = this.helperDateService.create();
        const start = this.helperDateService.backward(
            end,
            Duration.fromMillis(windowMs)
        );
        const rows =
            await this.userForgotPasswordAnalyticDomain.getCreatedInRange(
                start,
                end
            );
        const map = new Map<string, number>();
        for (const r of rows) {
            const domain = r.to.includes('@') ? r.to.split('@')[1] : r.to;
            map.set(domain, (map.get(domain) ?? 0) + 1);
        }
        return [...map.entries()]
            .filter(
                ([, count]) =>
                    count >= this.passwordResetEnumerationMinRequestsPerIp
            )
            .map(([key, count]) => ({ key, count }));
    }

    private async computeSessionAfterAdmin(
        startDate: Date,
        endDate: Date
    ): Promise<IAnalyticSessionAfterAdmin[]> {
        const revokes =
            await this.activityLogAnalyticDomain.getManyByActionsInRange(
                [
                    EnumActivityLogAction.userRevokeSessionByAdmin,
                    EnumActivityLogAction.userRevokeAllSessionsByAdmin,
                ],
                startDate,
                endDate
            );
        const flagged: IAnalyticSessionAfterAdmin[] = [];
        for (const revoke of revokes) {
            const windowEnd = this.helperDateService.forward(
                revoke.createdAt,
                Duration.fromMillis(this.sessionAfterAdminRevokeInMs)
            );
            const logins = await this.userLoginAnalyticDomain.getLoginEvents(
                revoke.createdAt,
                windowEnd
            );
            const hit = logins.find(l => l.userId === revoke.userId);
            if (hit) {
                flagged.push({
                    userId: revoke.userId,
                    revokedAt: revoke.createdAt,
                    loginAt: hit.createdAt,
                });
            }
        }
        return flagged;
    }

    private async computeForgotPasswordAbuse(
        windowMs: number
    ): Promise<IAnalyticForgotPasswordAbuse[]> {
        const end = this.helperDateService.create();
        const start = this.helperDateService.backward(
            end,
            Duration.fromMillis(windowMs)
        );
        const rows =
            await this.userForgotPasswordAnalyticDomain.getUnusedTokenCountsByUser(
                start,
                end
            );
        return rows
            .filter(
                r => r.count >= this.forgotPasswordTokenAbuseMinUnusedTokens
            )
            .map(r => ({ userId: r.userId, tokenCount: r.count }));
    }

    private async computeRefreshSpike(
        windowMs: number
    ): Promise<IAnalyticRefreshSpike[]> {
        const end = this.helperDateService.create();
        const start = this.helperDateService.backward(
            end,
            Duration.fromMillis(windowMs)
        );
        const events =
            await this.activityLogAnalyticDomain.getManyByActionsInRange(
                [EnumActivityLogAction.userRefreshToken],
                start,
                end
            );
        const map = new Map<string, number>();
        for (const e of events) {
            map.set(e.userId, (map.get(e.userId) ?? 0) + 1);
        }
        return [...map.entries()]
            .filter(([, count]) => count >= this.refreshSpikeMinEvents)
            .map(([userId, count]) => ({ userId, count }));
    }

    private async computeBackupCodeNewDevice(
        windowMs: number
    ): Promise<IAnalyticBackupCodeNewDevice[]> {
        const end = this.helperDateService.create();
        const start = this.helperDateService.backward(
            end,
            Duration.fromMillis(windowMs)
        );
        const regenerations =
            await this.activityLogAnalyticDomain.getManyByActionsInRange(
                [EnumActivityLogAction.userRegenerateTwoFactorBackupCodes],
                start,
                end
            );
        const flagged: IAnalyticBackupCodeNewDevice[] = [];
        for (const regeneration of regenerations) {
            const windowEnd = this.helperDateService.forward(
                regeneration.createdAt,
                Duration.fromMillis(windowMs)
            );
            const devices = await this.deviceAnalyticDomain.getCreatedInRange(
                regeneration.createdAt,
                windowEnd
            );
            if (devices.some(d => d.userId === regeneration.userId)) {
                flagged.push({
                    userId: regeneration.userId,
                    regeneratedAt: regeneration.createdAt,
                });
            }
        }
        return flagged;
    }

    private async computeApiKeyBurst(
        windowMs: number
    ): Promise<IAnalyticApiKeyBurst[]> {
        const end = this.helperDateService.create();
        const start = this.helperDateService.backward(
            end,
            Duration.fromMillis(windowMs)
        );
        const events =
            await this.activityLogAnalyticDomain.getManyByActionsInRange(
                [
                    EnumActivityLogAction.adminApiKeyCreate,
                    EnumActivityLogAction.adminApiKeyReset,
                ],
                start,
                end
            );
        const map = new Map<string, number>();
        for (const e of events) {
            map.set(e.userId, (map.get(e.userId) ?? 0) + 1);
        }
        return [...map.entries()]
            .filter(([, count]) => count >= this.apiKeyBurstMinEvents)
            .map(([userId, count]) => ({ userId, count }));
    }

    async credentialStuffingSummary(
        windowMs: number | null
    ): Promise<IAnalyticFraudSummary> {
        const window = this.resolveWindow(
            windowMs,
            this.credentialStuffingWindowInMs
        );
        const cached =
            await this.analyticCache.getFraudSummary<IAnalyticFraudSummary>(
                'credential-stuffing',
                String(window)
            );
        if (cached) {
            return cached;
        }
        const rows = await this.computeCredentialStuffing(window);
        const summary: IAnalyticFraudSummary = {
            count: rows.length,
            window: String(window),
            meta: {
                minUniqueAccounts: this.credentialStuffingMinUniqueAccounts,
            },
        };
        await this.analyticCache.setFraudSummary(
            'credential-stuffing',
            String(window),
            summary
        );
        return summary;
    }

    async credentialStuffingList(
        windowMs: number | null,
        params: IPaginationQueryOffsetParams<Prisma.ActivityLogWhereInput>
    ): Promise<IResponsePaginationReturn<IAnalyticCredentialStuffing>> {
        const window = this.resolveWindow(
            windowMs,
            this.credentialStuffingWindowInMs
        );
        const rows = await this.computeCredentialStuffing(window);

        const { skip, limit, orderBy } = params;
        const sorted = this.analyticSortUtil.sortRows(
            rows,
            orderBy,
            AnalyticCredentialStuffingAvailableOrderBy
        );
        const data = sorted.slice(skip, skip + limit);

        return this.paginationService.offsetPage(data, sorted.length, {
            skip,
            limit,
        });
    }

    async accountTakeoverSummary(
        startDate: Date,
        endDate: Date
    ): Promise<IAnalyticFraudSummary> {
        const window = this.analyticDateUtil.windowToken(startDate, endDate);
        const cached =
            await this.analyticCache.getFraudSummary<IAnalyticFraudSummary>(
                'account-takeover',
                window
            );
        if (cached) {
            return cached;
        }
        const rows = await this.computeAccountTakeover(startDate, endDate);
        const summary: IAnalyticFraudSummary = {
            count: rows.length,
            window,
        };
        await this.analyticCache.setFraudSummary(
            'account-takeover',
            window,
            summary
        );
        return summary;
    }

    async accountTakeoverList(
        startDate: Date,
        endDate: Date,
        params: IPaginationQueryOffsetParams<Prisma.PasswordHistoryWhereInput>
    ): Promise<IResponsePaginationReturn<IAnalyticAccountTakeover>> {
        const rows = await this.computeAccountTakeover(startDate, endDate);

        const { skip, limit, orderBy } = params;
        const sorted = this.analyticSortUtil.sortRows(
            rows,
            orderBy,
            AnalyticAccountTakeoverAvailableOrderBy
        );
        const data = sorted.slice(skip, skip + limit);

        return this.paginationService.offsetPage(data, sorted.length, {
            skip,
            limit,
        });
    }

    async massRegistrationSummary(
        windowMs: number | null
    ): Promise<IAnalyticFraudSummary> {
        const window = this.resolveWindow(
            windowMs,
            this.massRegistrationWindowInMs
        );
        const cached =
            await this.analyticCache.getFraudSummary<IAnalyticFraudSummary>(
                'mass-registration',
                String(window)
            );
        if (cached) {
            return cached;
        }
        const rows = await this.computeMassRegistration(window);
        const summary: IAnalyticFraudSummary = {
            count: rows.length,
            window: String(window),
        };
        await this.analyticCache.setFraudSummary(
            'mass-registration',
            String(window),
            summary
        );
        return summary;
    }

    async massRegistrationList(
        windowMs: number | null,
        params: IPaginationQueryOffsetParams<Prisma.UserWhereInput>
    ): Promise<IResponsePaginationReturn<IAnalyticMassRegistration>> {
        const window = this.resolveWindow(
            windowMs,
            this.massRegistrationWindowInMs
        );
        const rows = await this.computeMassRegistration(window);

        const { skip, limit, orderBy } = params;
        const sorted = this.analyticSortUtil.sortRows(
            rows,
            orderBy,
            AnalyticKeyCountAvailableOrderBy
        );
        const data = sorted.slice(skip, skip + limit);

        return this.paginationService.offsetPage(data, sorted.length, {
            skip,
            limit,
        });
    }

    async passwordResetEnumerationSummary(
        windowMs: number | null
    ): Promise<IAnalyticFraudSummary> {
        const window = this.resolveWindow(
            windowMs,
            this.passwordResetEnumerationWindowInMs
        );
        const cached =
            await this.analyticCache.getFraudSummary<IAnalyticFraudSummary>(
                'password-reset-enumeration',
                String(window)
            );
        if (cached) {
            return cached;
        }
        const rows = await this.computePasswordResetEnumeration(window);
        const summary: IAnalyticFraudSummary = {
            count: rows.length,
            window: String(window),
        };
        await this.analyticCache.setFraudSummary(
            'password-reset-enumeration',
            String(window),
            summary
        );
        return summary;
    }

    async passwordResetEnumerationList(
        windowMs: number | null,
        params: IPaginationQueryOffsetParams<Prisma.ForgotPasswordWhereInput>
    ): Promise<IResponsePaginationReturn<IAnalyticPasswordResetEnumeration>> {
        const window = this.resolveWindow(
            windowMs,
            this.passwordResetEnumerationWindowInMs
        );
        const rows = await this.computePasswordResetEnumeration(window);

        const { skip, limit, orderBy } = params;
        const sorted = this.analyticSortUtil.sortRows(
            rows,
            orderBy,
            AnalyticKeyCountAvailableOrderBy
        );
        const data = sorted.slice(skip, skip + limit);

        return this.paginationService.offsetPage(data, sorted.length, {
            skip,
            limit,
        });
    }

    async sharedFingerprintSummary(): Promise<IAnalyticFraudSummary> {
        const cached =
            await this.analyticCache.getFraudSummary<IAnalyticFraudSummary>(
                'shared-fingerprint',
                '_'
            );
        if (cached) {
            return cached;
        }
        const rows = await this.deviceAnalyticDomain.getSharedFingerprints(
            this.sharedFingerprintMinUsersPerFingerprint
        );
        const summary: IAnalyticFraudSummary = { count: rows.length };
        await this.analyticCache.setFraudSummary(
            'shared-fingerprint',
            '_',
            summary
        );
        return summary;
    }

    async sharedFingerprintList(
        params: IPaginationQueryOffsetParams<Prisma.DeviceOwnershipWhereInput>
    ): Promise<IResponsePaginationReturn<IAnalyticSharedFingerprint>> {
        const rows = await this.deviceAnalyticDomain.getSharedFingerprints(
            this.sharedFingerprintMinUsersPerFingerprint
        );
        const { skip, limit, orderBy } = params;
        const sorted = this.analyticSortUtil.sortRows(
            rows,
            orderBy,
            AnalyticSharedFingerprintAvailableOrderBy
        );
        const data = sorted.slice(skip, skip + limit);

        return this.paginationService.offsetPage(data, sorted.length, {
            skip,
            limit,
        });
    }

    async sessionAfterAdminSummary(
        startDate: Date,
        endDate: Date
    ): Promise<IAnalyticFraudSummary> {
        const window = this.analyticDateUtil.windowToken(startDate, endDate);
        const cached =
            await this.analyticCache.getFraudSummary<IAnalyticFraudSummary>(
                'session-after-admin',
                window
            );
        if (cached) {
            return cached;
        }
        const rows = await this.computeSessionAfterAdmin(startDate, endDate);
        const summary: IAnalyticFraudSummary = {
            count: rows.length,
            window,
        };
        await this.analyticCache.setFraudSummary(
            'session-after-admin',
            window,
            summary
        );
        return summary;
    }

    async sessionAfterAdminList(
        startDate: Date,
        endDate: Date,
        params: IPaginationQueryOffsetParams<Prisma.ActivityLogWhereInput>
    ): Promise<IResponsePaginationReturn<IAnalyticSessionAfterAdmin>> {
        const rows = await this.computeSessionAfterAdmin(startDate, endDate);

        const { skip, limit, orderBy } = params;
        const sorted = this.analyticSortUtil.sortRows(
            rows,
            orderBy,
            AnalyticSessionAfterAdminAvailableOrderBy
        );
        const data = sorted.slice(skip, skip + limit);

        return this.paginationService.offsetPage(data, sorted.length, {
            skip,
            limit,
        });
    }

    async forgotPasswordTokenAbuseSummary(
        windowMs: number | null
    ): Promise<IAnalyticFraudSummary> {
        const window = this.resolveWindow(
            windowMs,
            this.forgotPasswordTokenAbuseWindowInMs
        );
        const cached =
            await this.analyticCache.getFraudSummary<IAnalyticFraudSummary>(
                'forgot-password-token-abuse',
                String(window)
            );
        if (cached) {
            return cached;
        }
        const rows = await this.computeForgotPasswordAbuse(window);
        const summary: IAnalyticFraudSummary = {
            count: rows.length,
            window: String(window),
        };
        await this.analyticCache.setFraudSummary(
            'forgot-password-token-abuse',
            String(window),
            summary
        );
        return summary;
    }

    async forgotPasswordTokenAbuseList(
        windowMs: number | null,
        params: IPaginationQueryOffsetParams<Prisma.ForgotPasswordWhereInput>
    ): Promise<IResponsePaginationReturn<IAnalyticForgotPasswordAbuse>> {
        const window = this.resolveWindow(
            windowMs,
            this.forgotPasswordTokenAbuseWindowInMs
        );
        const rows = await this.computeForgotPasswordAbuse(window);

        const { skip, limit, orderBy } = params;
        const sorted = this.analyticSortUtil.sortRows(
            rows,
            orderBy,
            AnalyticForgotPasswordAbuseAvailableOrderBy
        );
        const data = sorted.slice(skip, skip + limit);

        return this.paginationService.offsetPage(data, sorted.length, {
            skip,
            limit,
        });
    }

    async refreshSpikeSummary(
        windowMs: number | null
    ): Promise<IAnalyticFraudSummary> {
        const window = this.resolveWindow(
            windowMs,
            this.refreshSpikeWindowInMs
        );
        const cached =
            await this.analyticCache.getFraudSummary<IAnalyticFraudSummary>(
                'refresh-spike',
                String(window)
            );
        if (cached) {
            return cached;
        }
        const rows = await this.computeRefreshSpike(window);
        const summary: IAnalyticFraudSummary = {
            count: rows.length,
            window: String(window),
        };
        await this.analyticCache.setFraudSummary(
            'refresh-spike',
            String(window),
            summary
        );
        return summary;
    }

    async refreshSpikeList(
        windowMs: number | null,
        params: IPaginationQueryOffsetParams<Prisma.ActivityLogWhereInput>
    ): Promise<IResponsePaginationReturn<IAnalyticRefreshSpike>> {
        const window = this.resolveWindow(
            windowMs,
            this.refreshSpikeWindowInMs
        );
        const rows = await this.computeRefreshSpike(window);

        const { skip, limit, orderBy } = params;
        const sorted = this.analyticSortUtil.sortRows(
            rows,
            orderBy,
            AnalyticUserCountAvailableOrderBy
        );
        const data = sorted.slice(skip, skip + limit);

        return this.paginationService.offsetPage(data, sorted.length, {
            skip,
            limit,
        });
    }

    async backupCodeNewDeviceSummary(
        windowMs: number | null
    ): Promise<IAnalyticFraudSummary> {
        const window = this.resolveWindow(
            windowMs,
            this.backupCodeNewDeviceWindowInMs
        );
        const cached =
            await this.analyticCache.getFraudSummary<IAnalyticFraudSummary>(
                'backup-code-new-device',
                String(window)
            );
        if (cached) {
            return cached;
        }
        const rows = await this.computeBackupCodeNewDevice(window);
        const summary: IAnalyticFraudSummary = {
            count: rows.length,
            window: String(window),
        };
        await this.analyticCache.setFraudSummary(
            'backup-code-new-device',
            String(window),
            summary
        );
        return summary;
    }

    async backupCodeNewDeviceList(
        windowMs: number | null,
        params: IPaginationQueryOffsetParams<Prisma.ActivityLogWhereInput>
    ): Promise<IResponsePaginationReturn<IAnalyticBackupCodeNewDevice>> {
        const window = this.resolveWindow(
            windowMs,
            this.backupCodeNewDeviceWindowInMs
        );
        const rows = await this.computeBackupCodeNewDevice(window);

        const { skip, limit, orderBy } = params;
        const sorted = this.analyticSortUtil.sortRows(
            rows,
            orderBy,
            AnalyticBackupCodeNewDeviceAvailableOrderBy
        );
        const data = sorted.slice(skip, skip + limit);

        return this.paginationService.offsetPage(data, sorted.length, {
            skip,
            limit,
        });
    }

    async apiKeyBurstSummary(
        windowMs: number | null
    ): Promise<IAnalyticFraudSummary> {
        const window = this.resolveWindow(windowMs, this.apiKeyBurstWindowInMs);
        const cached =
            await this.analyticCache.getFraudSummary<IAnalyticFraudSummary>(
                'api-key-burst',
                String(window)
            );
        if (cached) {
            return cached;
        }
        const rows = await this.computeApiKeyBurst(window);
        const summary: IAnalyticFraudSummary = {
            count: rows.length,
            window: String(window),
        };
        await this.analyticCache.setFraudSummary(
            'api-key-burst',
            String(window),
            summary
        );
        return summary;
    }

    async apiKeyBurstList(
        windowMs: number | null,
        params: IPaginationQueryOffsetParams<Prisma.ActivityLogWhereInput>
    ): Promise<IResponsePaginationReturn<IAnalyticApiKeyBurst>> {
        const window = this.resolveWindow(windowMs, this.apiKeyBurstWindowInMs);
        const rows = await this.computeApiKeyBurst(window);

        const { skip, limit, orderBy } = params;
        const sorted = this.analyticSortUtil.sortRows(
            rows,
            orderBy,
            AnalyticUserCountAvailableOrderBy
        );
        const data = sorted.slice(skip, skip + limit);

        return this.paginationService.offsetPage(data, sorted.length, {
            skip,
            limit,
        });
    }

    async riskScore(userId: string): Promise<IAnalyticFraudRiskScore> {
        const cached =
            await this.analyticCache.getRiskScore<IAnalyticFraudRiskScore>(
                userId
            );
        if (cached) {
            return cached;
        }

        const user = await this.userAnalyticDomain.getOneById(userId);
        if (!user) {
            throw new UserNotFoundException();
        }

        const weights = {
            sessionAfterAdmin: this.weightSessionAfterAdmin,
            impossibleTravel: this.weightImpossibleTravel,
            newDeviceAfterPasswordChange:
                this.weightNewDeviceAfterPasswordChange,
            credentialStuffingIp: this.weightCredentialStuffingIp,
            sharedFingerprint: this.weightSharedFingerprint,
            nearLockout: this.weightNearLockout,
            massRegistrationIp: this.weightMassRegistrationIp,
            forgotPasswordAbuse: this.weightForgotPasswordAbuse,
        };

        const contributingSignalCodes: string[] = [];
        let score = 0;

        if (
            (user.passwordAttempt ?? 0) >=
            Math.max(
                1,
                this.passwordMaxAttempt - this.failedLoginSpikeNearLockoutOffset
            )
        ) {
            score += weights.nearLockout;
            contributingSignalCodes.push('nearLockout');
        }

        const shared = await this.deviceAnalyticDomain.getSharedFingerprints(
            this.sharedFingerprintMinUsersPerFingerprint
        );
        if (shared.some(s => s.userIds.includes(userId))) {
            score += weights.sharedFingerprint;
            contributingSignalCodes.push('sharedFingerprint');
        }

        const band = this.resolveBand(score);
        const result: IAnalyticFraudRiskScore = {
            userId,
            score,
            band,
            contributingSignalCodes,
        };
        await this.analyticCache.setRiskScore(userId, result);
        return result;
    }

    async riskScores(
        minScore: number | null,
        params: IPaginationQueryOffsetParams<Prisma.UserWhereInput>
    ): Promise<IResponsePaginationReturn<IAnalyticFraudRiskScore>> {
        const near = await this.userAnalyticDomain.getNearLockout(1);
        const scored: IAnalyticFraudRiskScore[] = [];
        for (const u of near.slice(0, 100)) {
            const s = await this.riskScore(u.id);
            if (minScore === null || s.score >= minScore) {
                scored.push(s);
            }
        }
        scored.sort((a, b) => b.score - a.score);
        const { skip, limit, orderBy } = params;
        const sorted = this.analyticSortUtil.sortRows(
            scored,
            orderBy,
            AnalyticFraudRiskScoreAvailableOrderBy
        );
        const data = sorted.slice(skip, skip + limit);

        return this.paginationService.offsetPage(data, sorted.length, {
            skip,
            limit,
        });
    }
}
