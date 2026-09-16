import { HelperDateService } from '@common/helper/services/helper.date.service';
import { EnumPaginationType } from '@common/pagination/enums/pagination.enum';
import { IPaginationQueryOffsetParams } from '@common/pagination/interfaces/pagination.interface';
import { IResponsePagingReturn } from '@common/response/interfaces/response.interface';
import { ActivityLogAnalyticDomain } from '@modules/activity-log/domains/activity-log.analytic.domain';
import { AnalyticCache } from '@modules/analytic/caches/analytic.cache';
import {
    IAnalyticAccountTakeoverRow,
    IAnalyticApiKeyBurstRow,
    IAnalyticBackupCodeNewDeviceRow,
    IAnalyticCredentialStuffingRow,
    IAnalyticForgotPasswordAbuseRow,
    IAnalyticFraudRiskScore,
    IAnalyticFraudSummary,
    IAnalyticMassRegistrationRow,
    IAnalyticPasswordResetEnumerationRow,
    IAnalyticRefreshSpikeRow,
    IAnalyticSessionAfterAdminRow,
    IAnalyticSharedFingerprintRow,
} from '@modules/analytic/interfaces/analytic.interface';
import { AnalyticDateUtil } from '@modules/analytic/utils/analytic.date.util';
import { DeviceAnalyticDomain } from '@modules/device/domains/device.analytic.domain';
import { UserAnalyticDomain } from '@modules/user/domains/user.analytic.domain';
import { UserForgotPasswordAnalyticDomain } from '@modules/user/domains/user.forgot-password.analytic.domain';
import { UserLoginAnalyticDomain } from '@modules/user/domains/user.login.analytic.domain';
import { UserNotFoundException } from '@modules/user/exceptions/user.not-found.exception';
import { UserPasswordAnalyticDomain } from '@modules/user/domains/user.password.analytic.domain';
import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { EnumActivityLogAction, Prisma } from '@generated/prisma-client';
import { Duration } from 'luxon';

@Injectable()
export class AnalyticFraudDomain {
    constructor(
        private readonly analyticCache: AnalyticCache,
        private readonly analyticDateUtil: AnalyticDateUtil,
        private readonly configService: ConfigService,
        private readonly helperDateService: HelperDateService,
        private readonly activityLogAnalyticDomain: ActivityLogAnalyticDomain,
        private readonly userLoginAnalyticDomain: UserLoginAnalyticDomain,
        private readonly userAnalyticDomain: UserAnalyticDomain,
        private readonly userPasswordAnalyticDomain: UserPasswordAnalyticDomain,
        private readonly userForgotPasswordAnalyticDomain: UserForgotPasswordAnalyticDomain,
        private readonly deviceAnalyticDomain: DeviceAnalyticDomain
    ) {}

    private resolveWindow(windowMs: number | null, configKey: string): number {
        if (windowMs) {
            return windowMs;
        }
        return this.configService.get<number>(configKey)!;
    }

    private resolveBand(score: number): string {
        const monitorMax = this.configService.get<number>(
            'analytic.fraud.bands.monitorMax'
        )!;
        const reviewMax = this.configService.get<number>(
            'analytic.fraud.bands.reviewMax'
        )!;
        const elevateMax = this.configService.get<number>(
            'analytic.fraud.bands.elevateMax'
        )!;
        if (score <= monitorMax) {
            return this.configService.get<string>(
                'analytic.fraud.bandLabels.monitor'
            )!;
        }
        if (score <= reviewMax) {
            return this.configService.get<string>(
                'analytic.fraud.bandLabels.review'
            )!;
        }
        if (score <= elevateMax) {
            return this.configService.get<string>(
                'analytic.fraud.bandLabels.elevate'
            )!;
        }
        return this.configService.get<string>(
            'analytic.fraud.bandLabels.critical'
        )!;
    }

    private pageRows<T>(
        rows: T[],
        skip: number,
        limit: number
    ): IResponsePagingReturn<T> {
        const page = limit > 0 ? Math.floor(skip / limit) : 0;
        const perPage = limit;
        const totalPage = Math.ceil(rows.length / perPage) || 1;
        const hasNext = page + 1 < totalPage;
        const hasPrevious = page > 0;
        return {
            type: EnumPaginationType.offset,
            count: rows.length,
            perPage,
            page,
            totalPage,
            hasNext,
            hasPrevious,
            data: rows.slice(skip, skip + perPage),
            ...(hasNext ? { nextPage: page + 1 } : {}),
            ...(hasPrevious ? { previousPage: page - 1 } : {}),
        };
    }

    private async computeCredentialStuffing(
        windowMs: number
    ): Promise<IAnalyticCredentialStuffingRow[]> {
        const end = this.helperDateService.create();
        const start = this.helperDateService.backward(
            end,
            Duration.fromMillis(windowMs)
        );
        const events = await this.userLoginAnalyticDomain.findFailedLoginEvents(
            start,
            end
        );
        const minUnique = this.configService.get<number>(
            'analytic.fraud.credentialStuffing.minUniqueAccounts'
        )!;
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
            .filter(([, v]) => v.users.size >= minUnique)
            .map(([ipAddress, v]) => ({
                ipAddress,
                uniqueUsers: v.users.size,
                failCount: v.failCount,
            }));
    }

    private async computeAccountTakeover(
        startDate: Date,
        endDate: Date
    ): Promise<IAnalyticAccountTakeoverRow[]> {
        const changes =
            await this.userPasswordAnalyticDomain.findProfileChanges(
                startDate,
                endDate
            );
        const windowMs = this.configService.get<number>(
            'analytic.fraud.accountTakeover.newDeviceAfterPasswordChangeInMs'
        )!;
        const flagged: IAnalyticAccountTakeoverRow[] = [];
        for (const change of changes) {
            const devices = await this.deviceAnalyticDomain.findCreatedInRange(
                change.createdAt,
                this.helperDateService.forward(
                    change.createdAt,
                    Duration.fromMillis(windowMs)
                )
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
    ): Promise<IAnalyticMassRegistrationRow[]> {
        const end = this.helperDateService.create();
        const start = this.helperDateService.backward(
            end,
            Duration.fromMillis(windowMs)
        );
        const users = await this.userAnalyticDomain.findSignUpsInRange(
            start,
            end
        );
        const minAccounts = this.configService.get<number>(
            'analytic.fraud.massRegistration.minAccountsPerIp'
        )!;
        const map = new Map<string, number>();
        for (const u of users) {
            const key = String(u.signUpFrom);
            map.set(key, (map.get(key) ?? 0) + 1);
        }
        return [...map.entries()]
            .filter(([, count]) => count >= minAccounts)
            .map(([key, count]) => ({ key, count }));
    }

    private async computePasswordResetEnumeration(
        windowMs: number
    ): Promise<IAnalyticPasswordResetEnumerationRow[]> {
        const end = this.helperDateService.create();
        const start = this.helperDateService.backward(
            end,
            Duration.fromMillis(windowMs)
        );
        const rows =
            await this.userForgotPasswordAnalyticDomain.findCreatedInRange(
                start,
                end
            );
        const minReq = this.configService.get<number>(
            'analytic.fraud.passwordResetEnumeration.minRequestsPerIp'
        )!;
        const map = new Map<string, number>();
        for (const r of rows) {
            const domain = r.to.includes('@') ? r.to.split('@')[1] : r.to;
            map.set(domain, (map.get(domain) ?? 0) + 1);
        }
        return [...map.entries()]
            .filter(([, count]) => count >= minReq)
            .map(([key, count]) => ({ key, count }));
    }

    private async computeSessionAfterAdmin(
        startDate: Date,
        endDate: Date
    ): Promise<IAnalyticSessionAfterAdminRow[]> {
        const revokes =
            await this.activityLogAnalyticDomain.findManyByActionsInRange(
                [
                    EnumActivityLogAction.adminSessionRevoke,
                    EnumActivityLogAction.userRevokeSessionByAdmin,
                    EnumActivityLogAction.userRevokeAllSessionsByAdmin,
                ],
                startDate,
                endDate
            );
        const delta = this.configService.get<number>(
            'analytic.fraud.sessionAfterAdmin.sessionAfterAdminRevokeInMs'
        )!;
        const flagged: IAnalyticSessionAfterAdminRow[] = [];
        for (const revoke of revokes) {
            const logins = await this.userLoginAnalyticDomain.findLoginEvents(
                revoke.createdAt,
                this.helperDateService.forward(
                    revoke.createdAt,
                    Duration.fromMillis(delta)
                )
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
    ): Promise<IAnalyticForgotPasswordAbuseRow[]> {
        const end = this.helperDateService.create();
        const start = this.helperDateService.backward(
            end,
            Duration.fromMillis(windowMs)
        );
        const minUnused = this.configService.get<number>(
            'analytic.fraud.forgotPasswordTokenAbuse.minUnusedTokens'
        )!;
        const rows =
            await this.userForgotPasswordAnalyticDomain.unusedTokenCountsByUser(
                start,
                end
            );
        return rows
            .filter(r => r.count >= minUnused)
            .map(r => ({ userId: r.userId, tokenCount: r.count }));
    }

    private async computeRefreshSpike(
        windowMs: number
    ): Promise<IAnalyticRefreshSpikeRow[]> {
        const end = this.helperDateService.create();
        const start = this.helperDateService.backward(
            end,
            Duration.fromMillis(windowMs)
        );
        const minEvents = this.configService.get<number>(
            'analytic.fraud.refreshSpike.minEvents'
        )!;
        const events =
            await this.activityLogAnalyticDomain.findManyByActionsInRange(
                [EnumActivityLogAction.userRefreshToken],
                start,
                end
            );
        const map = new Map<string, number>();
        for (const e of events) {
            map.set(e.userId, (map.get(e.userId) ?? 0) + 1);
        }
        return [...map.entries()]
            .filter(([, count]) => count >= minEvents)
            .map(([userId, count]) => ({ userId, count }));
    }

    private async computeBackupCodeNewDevice(
        windowMs: number
    ): Promise<IAnalyticBackupCodeNewDeviceRow[]> {
        const end = this.helperDateService.create();
        const start = this.helperDateService.backward(
            end,
            Duration.fromMillis(windowMs)
        );
        const regens =
            await this.activityLogAnalyticDomain.findManyByActionsInRange(
                [EnumActivityLogAction.userRegenerateTwoFactorBackupCodes],
                start,
                end
            );
        const flagged: IAnalyticBackupCodeNewDeviceRow[] = [];
        for (const regen of regens) {
            const devices = await this.deviceAnalyticDomain.findCreatedInRange(
                regen.createdAt,
                this.helperDateService.forward(
                    regen.createdAt,
                    Duration.fromMillis(windowMs)
                )
            );
            if (devices.some(d => d.userId === regen.userId)) {
                flagged.push({
                    userId: regen.userId,
                    regeneratedAt: regen.createdAt,
                });
            }
        }
        return flagged;
    }

    private async computeApiKeyBurst(
        windowMs: number
    ): Promise<IAnalyticApiKeyBurstRow[]> {
        const end = this.helperDateService.create();
        const start = this.helperDateService.backward(
            end,
            Duration.fromMillis(windowMs)
        );
        const minEvents = this.configService.get<number>(
            'analytic.fraud.apiKeyBurst.minEvents'
        )!;
        const events =
            await this.activityLogAnalyticDomain.findManyByActionsInRange(
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
            .filter(([, count]) => count >= minEvents)
            .map(([userId, count]) => ({ userId, count }));
    }

    async credentialStuffingSummary(
        windowMs: number | null
    ): Promise<IAnalyticFraudSummary> {
        const window = this.resolveWindow(
            windowMs,
            'analytic.fraud.credentialStuffing.windowInMs'
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
                minUniqueAccounts: this.configService.get<number>(
                    'analytic.fraud.credentialStuffing.minUniqueAccounts'
                )!,
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
    ): Promise<IResponsePagingReturn<IAnalyticCredentialStuffingRow>> {
        const window = this.resolveWindow(
            windowMs,
            'analytic.fraud.credentialStuffing.windowInMs'
        );
        return this.pageRows(
            await this.computeCredentialStuffing(window),
            params.skip,
            params.limit
        );
    }

    async accountTakeoverSummary(
        startDate: Date,
        endDate: Date
    ): Promise<IAnalyticFraudSummary> {
        const window =
            this.analyticDateUtil.cacheToken(startDate) +
            ':' +
            this.analyticDateUtil.cacheToken(endDate);
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
    ): Promise<IResponsePagingReturn<IAnalyticAccountTakeoverRow>> {
        return this.pageRows(
            await this.computeAccountTakeover(startDate, endDate),
            params.skip,
            params.limit
        );
    }

    async massRegistrationSummary(
        windowMs: number | null
    ): Promise<IAnalyticFraudSummary> {
        const window = this.resolveWindow(
            windowMs,
            'analytic.fraud.massRegistration.windowInMs'
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
    ): Promise<IResponsePagingReturn<IAnalyticMassRegistrationRow>> {
        const window = this.resolveWindow(
            windowMs,
            'analytic.fraud.massRegistration.windowInMs'
        );
        return this.pageRows(
            await this.computeMassRegistration(window),
            params.skip,
            params.limit
        );
    }

    async passwordResetEnumerationSummary(
        windowMs: number | null
    ): Promise<IAnalyticFraudSummary> {
        const window = this.resolveWindow(
            windowMs,
            'analytic.fraud.passwordResetEnumeration.windowInMs'
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
    ): Promise<IResponsePagingReturn<IAnalyticPasswordResetEnumerationRow>> {
        const window = this.resolveWindow(
            windowMs,
            'analytic.fraud.passwordResetEnumeration.windowInMs'
        );
        return this.pageRows(
            await this.computePasswordResetEnumeration(window),
            params.skip,
            params.limit
        );
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
        const minUsers = this.configService.get<number>(
            'analytic.fraud.sharedFingerprint.minUsersPerFingerprint'
        )!;
        const rows =
            await this.deviceAnalyticDomain.sharedFingerprints(minUsers);
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
    ): Promise<IResponsePagingReturn<IAnalyticSharedFingerprintRow>> {
        const minUsers = this.configService.get<number>(
            'analytic.fraud.sharedFingerprint.minUsersPerFingerprint'
        )!;
        const rows =
            await this.deviceAnalyticDomain.sharedFingerprints(minUsers);
        return this.pageRows(rows, params.skip, params.limit);
    }

    async sessionAfterAdminSummary(
        startDate: Date,
        endDate: Date
    ): Promise<IAnalyticFraudSummary> {
        const window =
            this.analyticDateUtil.cacheToken(startDate) +
            ':' +
            this.analyticDateUtil.cacheToken(endDate);
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
    ): Promise<IResponsePagingReturn<IAnalyticSessionAfterAdminRow>> {
        return this.pageRows(
            await this.computeSessionAfterAdmin(startDate, endDate),
            params.skip,
            params.limit
        );
    }

    async forgotPasswordTokenAbuseSummary(
        windowMs: number | null
    ): Promise<IAnalyticFraudSummary> {
        const window = this.resolveWindow(
            windowMs,
            'analytic.fraud.forgotPasswordTokenAbuse.windowInMs'
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
    ): Promise<IResponsePagingReturn<IAnalyticForgotPasswordAbuseRow>> {
        const window = this.resolveWindow(
            windowMs,
            'analytic.fraud.forgotPasswordTokenAbuse.windowInMs'
        );
        return this.pageRows(
            await this.computeForgotPasswordAbuse(window),
            params.skip,
            params.limit
        );
    }

    async refreshSpikeSummary(
        windowMs: number | null
    ): Promise<IAnalyticFraudSummary> {
        const window = this.resolveWindow(
            windowMs,
            'analytic.fraud.refreshSpike.windowInMs'
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
    ): Promise<IResponsePagingReturn<IAnalyticRefreshSpikeRow>> {
        const window = this.resolveWindow(
            windowMs,
            'analytic.fraud.refreshSpike.windowInMs'
        );
        return this.pageRows(
            await this.computeRefreshSpike(window),
            params.skip,
            params.limit
        );
    }

    async backupCodeNewDeviceSummary(
        windowMs: number | null
    ): Promise<IAnalyticFraudSummary> {
        const window = this.resolveWindow(
            windowMs,
            'analytic.fraud.backupCodeNewDevice.windowInMs'
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
    ): Promise<IResponsePagingReturn<IAnalyticBackupCodeNewDeviceRow>> {
        const window = this.resolveWindow(
            windowMs,
            'analytic.fraud.backupCodeNewDevice.windowInMs'
        );
        return this.pageRows(
            await this.computeBackupCodeNewDevice(window),
            params.skip,
            params.limit
        );
    }

    async apiKeyBurstSummary(
        windowMs: number | null
    ): Promise<IAnalyticFraudSummary> {
        const window = this.resolveWindow(
            windowMs,
            'analytic.fraud.apiKeyBurst.windowInMs'
        );
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
    ): Promise<IResponsePagingReturn<IAnalyticApiKeyBurstRow>> {
        const window = this.resolveWindow(
            windowMs,
            'analytic.fraud.apiKeyBurst.windowInMs'
        );
        return this.pageRows(
            await this.computeApiKeyBurst(window),
            params.skip,
            params.limit
        );
    }

    async riskScore(userId: string): Promise<IAnalyticFraudRiskScore> {
        const cached =
            await this.analyticCache.getRiskScore<IAnalyticFraudRiskScore>(
                userId
            );
        if (cached) {
            return cached;
        }

        const user = await this.userAnalyticDomain.findOneById(userId);
        if (!user) {
            throw new UserNotFoundException();
        }

        const weights = {
            sessionAfterAdmin: this.configService.get<number>(
                'analytic.fraud.weights.sessionAfterAdmin'
            )!,
            impossibleTravel: this.configService.get<number>(
                'analytic.fraud.weights.impossibleTravel'
            )!,
            newDeviceAfterPasswordChange: this.configService.get<number>(
                'analytic.fraud.weights.newDeviceAfterPasswordChange'
            )!,
            credentialStuffingIp: this.configService.get<number>(
                'analytic.fraud.weights.credentialStuffingIp'
            )!,
            sharedFingerprint: this.configService.get<number>(
                'analytic.fraud.weights.sharedFingerprint'
            )!,
            nearLockout: this.configService.get<number>(
                'analytic.fraud.weights.nearLockout'
            )!,
            massRegistrationIp: this.configService.get<number>(
                'analytic.fraud.weights.massRegistrationIp'
            )!,
            forgotPasswordAbuse: this.configService.get<number>(
                'analytic.fraud.weights.forgotPasswordAbuse'
            )!,
        };

        const contributingSignalCodes: string[] = [];
        let score = 0;

        const maxAttempt = this.configService.get<number>(
            'auth.password.maxAttempt'
        )!;
        const nearOffset = this.configService.get<number>(
            'analytic.anomaly.failedLoginSpike.nearLockoutOffset'
        )!;
        if (
            (user.passwordAttempt ?? 0) >= Math.max(1, maxAttempt - nearOffset)
        ) {
            score += weights.nearLockout;
            contributingSignalCodes.push('nearLockout');
        }

        const minUsers = this.configService.get<number>(
            'analytic.fraud.sharedFingerprint.minUsersPerFingerprint'
        )!;
        const shared =
            await this.deviceAnalyticDomain.sharedFingerprints(minUsers);
        if (shared.some(s => s.userIds.includes(userId))) {
            score += weights.sharedFingerprint;
            contributingSignalCodes.push('sharedFingerprint');
        }

        const result: IAnalyticFraudRiskScore = {
            userId,
            score,
            band: this.resolveBand(score),
            contributingSignalCodes,
        };
        await this.analyticCache.setRiskScore(userId, result);
        return result;
    }

    async riskScores(
        minScore: number | null,
        params: IPaginationQueryOffsetParams<Prisma.UserWhereInput>
    ): Promise<IResponsePagingReturn<IAnalyticFraudRiskScore>> {
        const near = await this.userAnalyticDomain.findNearLockout(1);
        const scored: IAnalyticFraudRiskScore[] = [];
        for (const u of near.slice(0, 100)) {
            const s = await this.riskScore(u.id);
            if (minScore === null || s.score >= minScore) {
                scored.push(s);
            }
        }
        scored.sort((a, b) => b.score - a.score);
        return this.pageRows(scored, params.skip, params.limit);
    }
}
