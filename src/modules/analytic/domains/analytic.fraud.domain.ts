import { HelperArrayService } from '@common/helper/services/helper.array.service';
import { HelperDateService } from '@common/helper/services/helper.date.service';
import type { IPaginationQueryOffsetParams } from '@common/pagination/interfaces/pagination.interface';
import { PaginationOffsetUtil } from '@common/pagination/utils/pagination.offset.util';
import type { IResponsePaginationReturn } from '@common/response/interfaces/response.interface';
import { ActivityLogAnalyticDomain } from '@modules/activity-log/domains/activity-log.analytic.domain';
import { AnalyticCache } from '@modules/analytic/caches/analytic.cache';
import { AnalyticAnomalyDomain } from '@modules/analytic/domains/analytic.anomaly.domain';
import { AnalyticDateDomain } from '@modules/analytic/domains/analytic.date.domain';
import {
    AnalyticCacheEmptyToken,
    AnalyticMassRegistrationActions,
} from '@modules/analytic/constants/analytic.constant';
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
import { EnumAnalyticFraudSignal } from '@modules/analytic/enums/analytic.enum';
import type {
    IAnalyticAccountTakeover,
    IAnalyticApiKeyBurst,
    IAnalyticBackupCodeNewDevice,
    IAnalyticCredentialStuffing,
    IAnalyticForgotPasswordAbuse,
    IAnalyticFraudCredentialStuffingSummary,
    IAnalyticFraudRiskScore,
    IAnalyticFraudSignalUsers,
    IAnalyticFraudSummary,
    IAnalyticIpGroup,
    IAnalyticMassRegistration,
    IAnalyticPasswordResetEnumeration,
    IAnalyticRefreshSpike,
    IAnalyticSessionAfterAdmin,
    IAnalyticSharedFingerprint,
} from '@modules/analytic/interfaces/analytic.interface';
import { AnalyticAnomalyUtil } from '@modules/analytic/utils/analytic.anomaly.util';
import { AnalyticBucketUtil } from '@modules/analytic/utils/analytic.bucket.util';
import { AnalyticDateUtil } from '@modules/analytic/utils/analytic.date.util';
import { AnalyticFraudUtil } from '@modules/analytic/utils/analytic.fraud.util';
import { AnalyticSortUtil } from '@modules/analytic/utils/analytic.sort.util';
import { DeviceAnalyticDomain } from '@modules/device/domains/device.analytic.domain';
import { PasswordHistoryAnalyticDomain } from '@modules/password-history/domains/password-history.analytic.domain';
import { UserLoginAnalyticActions } from '@modules/user/constants/user.constant';
import type { IUserAnalyticRef } from '@modules/user/interfaces/user.interface';
import { UserAnalyticDomain } from '@modules/user/domains/user.analytic.domain';
import { UserForgotPasswordAnalyticDomain } from '@modules/user/domains/user.forgot-password.analytic.domain';
import { UserNotFoundException } from '@modules/user/exceptions/user.not-found.exception';
import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
    EnumActivityLogAction,
    EnumPasswordHistoryType,
    Prisma,
} from '@generated/prisma-client/client';
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
    private readonly refreshSpikeMinCount: number;
    private readonly backupCodeNewDeviceWindowInMs: number;
    private readonly backupCodeNewDeviceAfterInMs: number;
    private readonly apiKeyBurstWindowInMs: number;
    private readonly apiKeyBurstMinCount: number;
    private readonly nearLockoutAttempt: number;
    private readonly riskScoreCandidateLimit: number;
    private readonly riskScoreLookbackInMs: number;
    private readonly concurrency: number;

    constructor(
        private readonly analyticCache: AnalyticCache,
        private readonly analyticDateDomain: AnalyticDateDomain,
        private readonly analyticDateUtil: AnalyticDateUtil,
        private readonly analyticSortUtil: AnalyticSortUtil,
        private readonly analyticFraudUtil: AnalyticFraudUtil,
        private readonly analyticAnomalyUtil: AnalyticAnomalyUtil,
        private readonly analyticBucketUtil: AnalyticBucketUtil,
        private readonly paginationOffsetUtil: PaginationOffsetUtil,
        private readonly configService: ConfigService,
        private readonly helperDateService: HelperDateService,
        private readonly helperArrayService: HelperArrayService,
        private readonly analyticAnomalyDomain: AnalyticAnomalyDomain,
        private readonly activityLogAnalyticDomain: ActivityLogAnalyticDomain,
        private readonly passwordHistoryAnalyticDomain: PasswordHistoryAnalyticDomain,
        private readonly userAnalyticDomain: UserAnalyticDomain,
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
        this.refreshSpikeMinCount = this.configService.get<number>(
            'analytic.fraud.refreshSpike.minCount'
        )!;
        this.backupCodeNewDeviceWindowInMs = this.configService.get<number>(
            'analytic.fraud.backupCodeNewDevice.windowInMs'
        )!;
        this.backupCodeNewDeviceAfterInMs = this.configService.get<number>(
            'analytic.fraud.backupCodeNewDevice.newDeviceAfterInMs'
        )!;
        this.apiKeyBurstWindowInMs = this.configService.get<number>(
            'analytic.fraud.apiKeyBurst.windowInMs'
        )!;
        this.apiKeyBurstMinCount = this.configService.get<number>(
            'analytic.fraud.apiKeyBurst.minCount'
        )!;
        const passwordMaxAttempt = this.configService.get<number>(
            'auth.password.maxAttempt'
        )!;
        this.nearLockoutAttempt =
            this.analyticFraudUtil.nearLockoutThreshold(passwordMaxAttempt);
        this.riskScoreCandidateLimit = this.configService.get<number>(
            'analytic.fraud.riskScore.candidateLimit'
        )!;
        this.riskScoreLookbackInMs = this.configService.get<number>(
            'analytic.fraud.riskScore.lookbackInMs'
        )!;
        this.concurrency = this.configService.get<number>(
            'analytic.fraud.concurrency'
        )!;
    }

    private async groupFlaggedCredentialStuffing(
        windowMs: number
    ): Promise<Map<string, IAnalyticIpGroup>> {
        const { startDate, endDate } =
            this.analyticDateUtil.windowRange(windowMs);
        const pairs =
            await this.activityLogAnalyticDomain.getGroupIpUserByActions(
                [
                    EnumActivityLogAction.userLoginFailed,
                    EnumActivityLogAction.userReachMaxPasswordAttempt,
                    EnumActivityLogAction.userReachMaxTwoFactorAttempt,
                ],
                startDate,
                endDate
            );
        const groups = this.analyticAnomalyUtil.groupByIp(pairs);

        return new Map(
            [...groups.entries()].filter(
                ([, group]) =>
                    group.users.size >= this.credentialStuffingMinUniqueAccounts
            )
        );
    }

    private async computeCredentialStuffing(
        windowMs: number
    ): Promise<IAnalyticCredentialStuffing[]> {
        const flagged = await this.groupFlaggedCredentialStuffing(windowMs);
        return [...flagged.entries()].map(([ipAddress, group]) => ({
            ipAddress,
            uniqueUsers: group.users.size,
            failCount: group.count,
        }));
    }

    private async collectCredentialStuffingUsers(
        windowMs: number
    ): Promise<Set<string>> {
        const flagged = await this.groupFlaggedCredentialStuffing(windowMs);
        return new Set([...flagged.values()].flatMap(v => [...v.users]));
    }

    private async computeAccountTakeover(
        startDate: Date,
        endDate: Date
    ): Promise<IAnalyticAccountTakeover[]> {
        const changes =
            await this.passwordHistoryAnalyticDomain.getByTypeInRange(
                EnumPasswordHistoryType.profile,
                startDate,
                endDate
            );
        const flagged: IAnalyticAccountTakeover[] = [];
        const batches = this.helperArrayService.chunk(
            changes,
            this.concurrency
        );
        for (const batch of batches) {
            const devicePromises = batch.map(change => {
                const windowEnd = this.helperDateService.forward(
                    change.createdAt,
                    Duration.fromMillis(
                        this.accountTakeoverNewDeviceAfterPasswordChangeInMs
                    )
                );
                return this.deviceAnalyticDomain.existsCreatedInRangeByUser(
                    change.userId,
                    change.createdAt,
                    windowEnd
                );
            });
            // Sequential by design: bounded chunks, concurrent within a chunk
            const hasDevicePerChange = await Promise.all(devicePromises);
            for (const [index, change] of batch.entries()) {
                if (hasDevicePerChange[index]) {
                    flagged.push({
                        userId: change.userId,
                        indicatorCodes: ['newDeviceAfterPasswordChange'],
                        passwordChangedAt: change.createdAt,
                    });
                }
            }
        }
        return flagged;
    }

    private async computeMassRegistration(
        windowMs: number
    ): Promise<IAnalyticMassRegistration[]> {
        const { startDate, endDate } =
            this.analyticDateUtil.windowRange(windowMs);
        const groups = await this.activityLogAnalyticDomain.getGroupIpByActions(
            AnalyticMassRegistrationActions,
            startDate,
            endDate,
            this.massRegistrationMinAccountsPerIp
        );
        return this.analyticBucketUtil.toBuckets(groups, 'ipAddress');
    }

    private async collectMassRegistrationUsers(
        windowMs: number
    ): Promise<Set<string>> {
        const flagged = await this.computeMassRegistration(windowMs);
        if (flagged.length === 0) {
            return new Set();
        }
        const { startDate, endDate } =
            this.analyticDateUtil.windowRange(windowMs);
        const userIds =
            await this.activityLogAnalyticDomain.getGroupUserIdByIps(
                AnalyticMassRegistrationActions,
                startDate,
                endDate,
                flagged.map(row => row.key)
            );
        return new Set(userIds);
    }

    private async computePasswordResetEnumeration(
        windowMs: number
    ): Promise<IAnalyticPasswordResetEnumeration[]> {
        const { startDate, endDate } =
            this.analyticDateUtil.windowRange(windowMs);
        const groups = await this.activityLogAnalyticDomain.getGroupIpByActions(
            [EnumActivityLogAction.userForgotPassword],
            startDate,
            endDate,
            this.passwordResetEnumerationMinRequestsPerIp
        );
        return this.analyticBucketUtil.toBuckets(groups, 'ipAddress');
    }

    private async computeSessionAfterAdmin(
        startDate: Date,
        endDate: Date
    ): Promise<IAnalyticSessionAfterAdmin[]> {
        const flagged: IAnalyticSessionAfterAdmin[] = [];
        let cursor: string | null = null;
        let hasNext = true;
        while (hasNext) {
            const page =
                await this.activityLogAnalyticDomain.getPageByActionsInRange(
                    [
                        EnumActivityLogAction.userRevokeSessionByAdmin,
                        EnumActivityLogAction.userRevokeAllSessionsByAdmin,
                    ],
                    startDate,
                    endDate,
                    cursor
                );
            const batches = this.helperArrayService.chunk(
                page.data,
                this.concurrency
            );
            for (const batch of batches) {
                const loginPromises = batch.map(revoke => {
                    const windowEnd = this.helperDateService.forward(
                        revoke.createdAt,
                        Duration.fromMillis(this.sessionAfterAdminRevokeInMs)
                    );
                    return this.activityLogAnalyticDomain.getOneByUserActionsInRange(
                        revoke.userId,
                        UserLoginAnalyticActions,
                        revoke.createdAt,
                        windowEnd
                    );
                });
                // Sequential by design: bounded chunks, concurrent within a chunk
                const loginPerRevoke = await Promise.all(loginPromises);
                for (const [index, revoke] of batch.entries()) {
                    const hit = loginPerRevoke[index]!;
                    if (hit) {
                        flagged.push({
                            userId: revoke.userId,
                            revokedAt: revoke.createdAt,
                            loginAt: hit.createdAt,
                        });
                    }
                }
            }
            cursor = page.cursor ?? null;
            hasNext = page.hasNext;
        }
        return flagged;
    }

    private async computeForgotPasswordAbuse(
        windowMs: number
    ): Promise<IAnalyticForgotPasswordAbuse[]> {
        const { startDate, endDate } =
            this.analyticDateUtil.windowRange(windowMs);
        const rows =
            await this.userForgotPasswordAnalyticDomain.getUnusedTokenCountsByUser(
                startDate,
                endDate,
                this.forgotPasswordTokenAbuseMinUnusedTokens
            );
        return rows.map(r => ({ userId: r.userId, tokenCount: r.count }));
    }

    private async computeRefreshSpike(
        windowMs: number
    ): Promise<IAnalyticRefreshSpike[]> {
        const { startDate, endDate } =
            this.analyticDateUtil.windowRange(windowMs);

        return this.activityLogAnalyticDomain.getGroupUserByActions(
            [EnumActivityLogAction.userRefreshToken],
            startDate,
            endDate,
            this.refreshSpikeMinCount
        );
    }

    private async computeBackupCodeNewDevice(
        windowMs: number
    ): Promise<IAnalyticBackupCodeNewDevice[]> {
        const { startDate, endDate } =
            this.analyticDateUtil.windowRange(windowMs);
        const flagged: IAnalyticBackupCodeNewDevice[] = [];
        let cursor: string | null = null;
        let hasNext = true;
        while (hasNext) {
            const page =
                await this.activityLogAnalyticDomain.getPageByActionsInRange(
                    [EnumActivityLogAction.userRegenerateTwoFactorBackupCodes],
                    startDate,
                    endDate,
                    cursor
                );
            const batches = this.helperArrayService.chunk(
                page.data,
                this.concurrency
            );
            for (const batch of batches) {
                const devicePromises = batch.map(regeneration => {
                    const windowEnd = this.helperDateService.forward(
                        regeneration.createdAt,
                        Duration.fromMillis(this.backupCodeNewDeviceAfterInMs)
                    );
                    return this.deviceAnalyticDomain.existsCreatedInRangeByUser(
                        regeneration.userId,
                        regeneration.createdAt,
                        windowEnd
                    );
                });
                // Sequential by design: bounded chunks, concurrent within a chunk
                const hasDevicePerRegeneration =
                    await Promise.all(devicePromises);
                for (const [index, regeneration] of batch.entries()) {
                    if (hasDevicePerRegeneration[index]) {
                        flagged.push({
                            userId: regeneration.userId,
                            regeneratedAt: regeneration.createdAt,
                        });
                    }
                }
            }
            cursor = page.cursor ?? null;
            hasNext = page.hasNext;
        }
        return flagged;
    }

    private async computeApiKeyBurst(
        windowMs: number
    ): Promise<IAnalyticApiKeyBurst[]> {
        const { startDate, endDate } =
            this.analyticDateUtil.windowRange(windowMs);

        return this.activityLogAnalyticDomain.getGroupUserByActions(
            [
                EnumActivityLogAction.adminApiKeyCreate,
                EnumActivityLogAction.adminApiKeyReset,
            ],
            startDate,
            endDate,
            this.apiKeyBurstMinCount
        );
    }

    private async collectSignalUsers(): Promise<IAnalyticFraudSignalUsers> {
        const { startDate, endDate } = this.analyticDateUtil.windowRange(
            this.riskScoreLookbackInMs
        );
        const [
            sessionAfterAdmin,
            impossibleTravelUserIds,
            accountTakeover,
            credentialStuffingUserIds,
            sharedFingerprint,
            massRegistrationUserIds,
            forgotPasswordAbuse,
        ] = await Promise.all([
            this.computeSessionAfterAdmin(startDate, endDate),
            this.analyticAnomalyDomain.getImpossibleTravelUserIds(
                startDate,
                endDate
            ),
            this.computeAccountTakeover(startDate, endDate),
            this.collectCredentialStuffingUsers(
                this.credentialStuffingWindowInMs
            ),
            this.deviceAnalyticDomain.getSharedFingerprints(
                this.sharedFingerprintMinUsersPerFingerprint
            ),
            this.collectMassRegistrationUsers(this.massRegistrationWindowInMs),
            this.computeForgotPasswordAbuse(
                this.forgotPasswordTokenAbuseWindowInMs
            ),
        ]);

        return this.analyticFraudUtil.toSignalUsers({
            sessionAfterAdmin,
            impossibleTravelUserIds,
            accountTakeover,
            credentialStuffingUserIds,
            sharedFingerprint,
            massRegistrationUserIds,
            forgotPasswordAbuse,
        });
    }

    private async scoreCached(
        userId: string
    ): Promise<IAnalyticFraudRiskScore> {
        const cached =
            await this.analyticCache.getRiskScore<IAnalyticFraudRiskScore>(
                userId
            );
        if (cached) {
            return cached;
        }

        // Sequential by design: gate before the work it guards
        const user = await this.userAnalyticDomain.getOneById(userId);
        if (!user) {
            throw new UserNotFoundException();
        }

        const signals = await this.collectSignalUsers();
        return this.scoreUser(user, signals);
    }

    private async scoreListed(
        user: IUserAnalyticRef,
        signals: IAnalyticFraudSignalUsers
    ): Promise<IAnalyticFraudRiskScore> {
        const cached =
            await this.analyticCache.getRiskScore<IAnalyticFraudRiskScore>(
                user.id
            );
        if (cached) {
            return cached;
        }

        return this.scoreUser(user, signals);
    }

    private async scoreUser(
        user: IUserAnalyticRef,
        signals: IAnalyticFraudSignalUsers
    ): Promise<IAnalyticFraudRiskScore> {
        const result = this.analyticFraudUtil.score(user, signals);
        await this.analyticCache.setRiskScore(user.id, result);
        return result;
    }

    async credentialStuffingSummary(
        windowMs: number | null
    ): Promise<IAnalyticFraudCredentialStuffingSummary> {
        const window = this.analyticDateDomain.resolveWindow(
            windowMs,
            this.credentialStuffingWindowInMs
        );
        const cached =
            await this.analyticCache.getFraudSummary<IAnalyticFraudCredentialStuffingSummary>(
                EnumAnalyticFraudSignal.credentialStuffing,
                String(window)
            );
        if (cached) {
            return cached;
        }
        const rows = await this.computeCredentialStuffing(window);
        const summary: IAnalyticFraudCredentialStuffingSummary = {
            count: rows.length,
            window: String(window),
            meta: {
                minUniqueAccounts: this.credentialStuffingMinUniqueAccounts,
            },
        };
        await this.analyticCache.setFraudSummary(
            EnumAnalyticFraudSignal.credentialStuffing,
            String(window),
            summary
        );
        return summary;
    }

    async credentialStuffingList(
        windowMs: number | null,
        params: IPaginationQueryOffsetParams<Prisma.ActivityLogWhereInput>
    ): Promise<IResponsePaginationReturn<IAnalyticCredentialStuffing>> {
        const window = this.analyticDateDomain.resolveWindow(
            windowMs,
            this.credentialStuffingWindowInMs
        );
        const rows = await this.computeCredentialStuffing(window);

        const { data, total } = this.analyticSortUtil.sortPage(
            rows,
            params,
            AnalyticCredentialStuffingAvailableOrderBy
        );

        return this.paginationOffsetUtil.page(data, total, {
            skip: params.skip,
            limit: params.limit,
        });
    }

    async accountTakeoverSummary(
        startDate: Date,
        endDate: Date
    ): Promise<IAnalyticFraudSummary> {
        const window = this.analyticDateUtil.windowToken(startDate, endDate);
        const cached =
            await this.analyticCache.getFraudSummary<IAnalyticFraudSummary>(
                EnumAnalyticFraudSignal.accountTakeover,
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
            EnumAnalyticFraudSignal.accountTakeover,
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

        const { data, total } = this.analyticSortUtil.sortPage(
            rows,
            params,
            AnalyticAccountTakeoverAvailableOrderBy
        );

        return this.paginationOffsetUtil.page(data, total, {
            skip: params.skip,
            limit: params.limit,
        });
    }

    async massRegistrationSummary(
        windowMs: number | null
    ): Promise<IAnalyticFraudSummary> {
        const window = this.analyticDateDomain.resolveWindow(
            windowMs,
            this.massRegistrationWindowInMs
        );
        const cached =
            await this.analyticCache.getFraudSummary<IAnalyticFraudSummary>(
                EnumAnalyticFraudSignal.massRegistration,
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
            EnumAnalyticFraudSignal.massRegistration,
            String(window),
            summary
        );
        return summary;
    }

    async massRegistrationList(
        windowMs: number | null,
        params: IPaginationQueryOffsetParams<Prisma.UserWhereInput>
    ): Promise<IResponsePaginationReturn<IAnalyticMassRegistration>> {
        const window = this.analyticDateDomain.resolveWindow(
            windowMs,
            this.massRegistrationWindowInMs
        );
        const rows = await this.computeMassRegistration(window);

        const { data, total } = this.analyticSortUtil.sortPage(
            rows,
            params,
            AnalyticKeyCountAvailableOrderBy
        );

        return this.paginationOffsetUtil.page(data, total, {
            skip: params.skip,
            limit: params.limit,
        });
    }

    async passwordResetEnumerationSummary(
        windowMs: number | null
    ): Promise<IAnalyticFraudSummary> {
        const window = this.analyticDateDomain.resolveWindow(
            windowMs,
            this.passwordResetEnumerationWindowInMs
        );
        const cached =
            await this.analyticCache.getFraudSummary<IAnalyticFraudSummary>(
                EnumAnalyticFraudSignal.passwordResetEnumeration,
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
            EnumAnalyticFraudSignal.passwordResetEnumeration,
            String(window),
            summary
        );
        return summary;
    }

    async passwordResetEnumerationList(
        windowMs: number | null,
        params: IPaginationQueryOffsetParams<Prisma.ForgotPasswordWhereInput>
    ): Promise<IResponsePaginationReturn<IAnalyticPasswordResetEnumeration>> {
        const window = this.analyticDateDomain.resolveWindow(
            windowMs,
            this.passwordResetEnumerationWindowInMs
        );
        const rows = await this.computePasswordResetEnumeration(window);

        const { data, total } = this.analyticSortUtil.sortPage(
            rows,
            params,
            AnalyticKeyCountAvailableOrderBy
        );

        return this.paginationOffsetUtil.page(data, total, {
            skip: params.skip,
            limit: params.limit,
        });
    }

    async sharedFingerprintSummary(): Promise<IAnalyticFraudSummary> {
        const cached =
            await this.analyticCache.getFraudSummary<IAnalyticFraudSummary>(
                EnumAnalyticFraudSignal.sharedFingerprint,
                AnalyticCacheEmptyToken
            );
        if (cached) {
            return cached;
        }
        const rows = await this.deviceAnalyticDomain.getSharedFingerprints(
            this.sharedFingerprintMinUsersPerFingerprint
        );
        const summary: IAnalyticFraudSummary = {
            count: rows.length,
            window: null,
        };
        await this.analyticCache.setFraudSummary(
            EnumAnalyticFraudSignal.sharedFingerprint,
            AnalyticCacheEmptyToken,
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
        const { data, total } = this.analyticSortUtil.sortPage(
            rows,
            params,
            AnalyticSharedFingerprintAvailableOrderBy
        );

        return this.paginationOffsetUtil.page(data, total, {
            skip: params.skip,
            limit: params.limit,
        });
    }

    async sessionAfterAdminSummary(
        startDate: Date,
        endDate: Date
    ): Promise<IAnalyticFraudSummary> {
        const window = this.analyticDateUtil.windowToken(startDate, endDate);
        const cached =
            await this.analyticCache.getFraudSummary<IAnalyticFraudSummary>(
                EnumAnalyticFraudSignal.sessionAfterAdmin,
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
            EnumAnalyticFraudSignal.sessionAfterAdmin,
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

        const { data, total } = this.analyticSortUtil.sortPage(
            rows,
            params,
            AnalyticSessionAfterAdminAvailableOrderBy
        );

        return this.paginationOffsetUtil.page(data, total, {
            skip: params.skip,
            limit: params.limit,
        });
    }

    async forgotPasswordTokenAbuseSummary(
        windowMs: number | null
    ): Promise<IAnalyticFraudSummary> {
        const window = this.analyticDateDomain.resolveWindow(
            windowMs,
            this.forgotPasswordTokenAbuseWindowInMs
        );
        const cached =
            await this.analyticCache.getFraudSummary<IAnalyticFraudSummary>(
                EnumAnalyticFraudSignal.forgotPasswordTokenAbuse,
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
            EnumAnalyticFraudSignal.forgotPasswordTokenAbuse,
            String(window),
            summary
        );
        return summary;
    }

    async forgotPasswordTokenAbuseList(
        windowMs: number | null,
        params: IPaginationQueryOffsetParams<Prisma.ForgotPasswordWhereInput>
    ): Promise<IResponsePaginationReturn<IAnalyticForgotPasswordAbuse>> {
        const window = this.analyticDateDomain.resolveWindow(
            windowMs,
            this.forgotPasswordTokenAbuseWindowInMs
        );
        const rows = await this.computeForgotPasswordAbuse(window);

        const { data, total } = this.analyticSortUtil.sortPage(
            rows,
            params,
            AnalyticForgotPasswordAbuseAvailableOrderBy
        );

        return this.paginationOffsetUtil.page(data, total, {
            skip: params.skip,
            limit: params.limit,
        });
    }

    async refreshSpikeSummary(
        windowMs: number | null
    ): Promise<IAnalyticFraudSummary> {
        const window = this.analyticDateDomain.resolveWindow(
            windowMs,
            this.refreshSpikeWindowInMs
        );
        const cached =
            await this.analyticCache.getFraudSummary<IAnalyticFraudSummary>(
                EnumAnalyticFraudSignal.refreshSpike,
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
            EnumAnalyticFraudSignal.refreshSpike,
            String(window),
            summary
        );
        return summary;
    }

    async refreshSpikeList(
        windowMs: number | null,
        params: IPaginationQueryOffsetParams<Prisma.ActivityLogWhereInput>
    ): Promise<IResponsePaginationReturn<IAnalyticRefreshSpike>> {
        const window = this.analyticDateDomain.resolveWindow(
            windowMs,
            this.refreshSpikeWindowInMs
        );
        const rows = await this.computeRefreshSpike(window);

        const { data, total } = this.analyticSortUtil.sortPage(
            rows,
            params,
            AnalyticUserCountAvailableOrderBy
        );

        return this.paginationOffsetUtil.page(data, total, {
            skip: params.skip,
            limit: params.limit,
        });
    }

    async backupCodeNewDeviceSummary(
        windowMs: number | null
    ): Promise<IAnalyticFraudSummary> {
        const window = this.analyticDateDomain.resolveWindow(
            windowMs,
            this.backupCodeNewDeviceWindowInMs
        );
        const cached =
            await this.analyticCache.getFraudSummary<IAnalyticFraudSummary>(
                EnumAnalyticFraudSignal.backupCodeNewDevice,
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
            EnumAnalyticFraudSignal.backupCodeNewDevice,
            String(window),
            summary
        );
        return summary;
    }

    async backupCodeNewDeviceList(
        windowMs: number | null,
        params: IPaginationQueryOffsetParams<Prisma.ActivityLogWhereInput>
    ): Promise<IResponsePaginationReturn<IAnalyticBackupCodeNewDevice>> {
        const window = this.analyticDateDomain.resolveWindow(
            windowMs,
            this.backupCodeNewDeviceWindowInMs
        );
        const rows = await this.computeBackupCodeNewDevice(window);

        const { data, total } = this.analyticSortUtil.sortPage(
            rows,
            params,
            AnalyticBackupCodeNewDeviceAvailableOrderBy
        );

        return this.paginationOffsetUtil.page(data, total, {
            skip: params.skip,
            limit: params.limit,
        });
    }

    async apiKeyBurstSummary(
        windowMs: number | null
    ): Promise<IAnalyticFraudSummary> {
        const window = this.analyticDateDomain.resolveWindow(
            windowMs,
            this.apiKeyBurstWindowInMs
        );
        const cached =
            await this.analyticCache.getFraudSummary<IAnalyticFraudSummary>(
                EnumAnalyticFraudSignal.apiKeyBurst,
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
            EnumAnalyticFraudSignal.apiKeyBurst,
            String(window),
            summary
        );
        return summary;
    }

    async apiKeyBurstList(
        windowMs: number | null,
        params: IPaginationQueryOffsetParams<Prisma.ActivityLogWhereInput>
    ): Promise<IResponsePaginationReturn<IAnalyticApiKeyBurst>> {
        const window = this.analyticDateDomain.resolveWindow(
            windowMs,
            this.apiKeyBurstWindowInMs
        );
        const rows = await this.computeApiKeyBurst(window);

        const { data, total } = this.analyticSortUtil.sortPage(
            rows,
            params,
            AnalyticUserCountAvailableOrderBy
        );

        return this.paginationOffsetUtil.page(data, total, {
            skip: params.skip,
            limit: params.limit,
        });
    }

    async riskScore(userId: string): Promise<IAnalyticFraudRiskScore> {
        return this.scoreCached(userId);
    }

    async riskScores(
        minScore: number | null,
        params: IPaginationQueryOffsetParams<Prisma.UserWhereInput>
    ): Promise<IResponsePaginationReturn<IAnalyticFraudRiskScore>> {
        const [signals, nearLockout] = await Promise.all([
            this.collectSignalUsers(),
            this.userAnalyticDomain.getNearLockout(
                this.nearLockoutAttempt,
                this.riskScoreCandidateLimit
            ),
        ]);

        const candidateIds = this.analyticFraudUtil.collectCandidateIds(
            signals,
            nearLockout,
            this.riskScoreCandidateLimit
        );
        const candidates =
            await this.userAnalyticDomain.getManyByIds(candidateIds);

        const all: IAnalyticFraudRiskScore[] = [];
        const batches = this.helperArrayService.chunk(
            candidates,
            this.concurrency
        );
        for (const batch of batches) {
            // Sequential by design: bounded chunks, concurrent within a chunk
            const batchScores = await Promise.all(
                batch.map(u => this.scoreListed(u, signals))
            );
            all.push(...batchScores);
        }

        const scored = all.filter(
            s => minScore === null || s.score >= minScore
        );
        scored.sort((a, b) => b.score - a.score);
        const { data, total } = this.analyticSortUtil.sortPage(
            scored,
            params,
            AnalyticFraudRiskScoreAvailableOrderBy
        );

        return this.paginationOffsetUtil.page(data, total, {
            skip: params.skip,
            limit: params.limit,
        });
    }
}
