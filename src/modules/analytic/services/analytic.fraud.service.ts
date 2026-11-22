import { CacheService } from '@common/cache/services/cache.service';
import { HelperArrayService } from '@common/helper/services/helper.array.service';
import { HelperDateService } from '@common/helper/services/helper.date.service';
import type { IPaginationQueryOffsetParams } from '@common/pagination/interfaces/pagination.interface';
import { PaginationOffsetUtil } from '@common/pagination/utils/pagination.offset.util';
import type { IResponsePaginationReturn } from '@common/response/interfaces/response.interface';
import { ActivityLogAnalyticService } from '@modules/activity-log/services/activity-log.analytic.service';
import { AnalyticCache } from '@modules/analytic/caches/analytic.cache';
import { AnalyticAnomalyService } from '@modules/analytic/services/analytic.anomaly.service';
import { AnalyticDateService } from '@modules/analytic/services/analytic.date.service';
import {
    AnalyticCacheEmptyToken,
    AnalyticFraudCredentialStuffingSummaryCacheSchema,
    AnalyticFraudRiskScoreCacheSchema,
    AnalyticFraudSummaryCacheSchema,
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
import {
    EnumAnalyticFraudBand,
    EnumAnalyticFraudContributingSignal,
    EnumAnalyticFraudSignal,
} from '@modules/analytic/enums/analytic.enum';
import type {
    IAnalyticAccountTakeover,
    IAnalyticApiKeyBurst,
    IAnalyticBackupCodeNewDevice,
    IAnalyticCredentialStuffing,
    IAnalyticForgotPasswordAbuse,
    IAnalyticFraudCredentialStuffingSummary,
    IAnalyticFraudRiskScore,
    IAnalyticFraudSignalRows,
    IAnalyticFraudSignalUsers,
    IAnalyticFraudSummary,
    IAnalyticIpGroup,
    IAnalyticMassRegistration,
    IAnalyticNearLockout,
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
import { DeviceAnalyticService } from '@modules/device/services/device.analytic.service';
import { PasswordHistoryAnalyticService } from '@modules/password-history/services/password-history.analytic.service';
import { UserLoginAnalyticActions } from '@modules/user/constants/user.constant';
import type { IUserAnalyticRef } from '@modules/user/interfaces/user.interface';
import { UserAnalyticService } from '@modules/user/services/user.analytic.service';
import { UserForgotPasswordAnalyticService } from '@modules/user/services/user.forgot-password.analytic.service';
import { UserNotFoundException } from '@modules/user/exceptions/user.not-found.exception';
import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
    EnumActivityLogAction,
    EnumPasswordHistoryType,
} from '@generated/prisma-client/client';
import { Duration } from 'luxon';

@Injectable()
export class AnalyticFraudService {
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
    private readonly newDeviceAfterInMs: number;
    private readonly apiKeyBurstWindowInMs: number;
    private readonly apiKeyBurstMinCount: number;
    private readonly riskScoreCandidateLimit: number;
    private readonly riskScoreLookbackInMs: number;
    private readonly concurrency: number;
    private readonly sessionAfterAdmin: number;
    private readonly impossibleTravel: number;
    private readonly newDeviceAfterPasswordChange: number;
    private readonly credentialStuffingIp: number;
    private readonly sharedFingerprint: number;
    private readonly nearLockout: number;
    private readonly massRegistrationIp: number;
    private readonly forgotPasswordAbuse: number;
    private readonly monitorMax: number;
    private readonly reviewMax: number;
    private readonly elevateMax: number;

    constructor(
        private readonly analyticCache: AnalyticCache,
        private readonly cacheService: CacheService,
        private readonly analyticDateService: AnalyticDateService,
        private readonly analyticDateUtil: AnalyticDateUtil,
        private readonly analyticSortUtil: AnalyticSortUtil,
        private readonly analyticFraudUtil: AnalyticFraudUtil,
        private readonly analyticAnomalyUtil: AnalyticAnomalyUtil,
        private readonly analyticBucketUtil: AnalyticBucketUtil,
        private readonly paginationOffsetUtil: PaginationOffsetUtil,
        private readonly configService: ConfigService,
        private readonly helperDateService: HelperDateService,
        private readonly helperArrayService: HelperArrayService,
        private readonly analyticAnomalyService: AnalyticAnomalyService,
        private readonly activityLogAnalyticService: ActivityLogAnalyticService,
        private readonly passwordHistoryAnalyticService: PasswordHistoryAnalyticService,
        private readonly userAnalyticService: UserAnalyticService,
        private readonly userForgotPasswordAnalyticService: UserForgotPasswordAnalyticService,
        private readonly deviceAnalyticService: DeviceAnalyticService
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
        this.newDeviceAfterInMs = this.configService.get<number>(
            'analytic.fraud.backupCodeNewDevice.newDeviceAfterInMs'
        )!;
        this.apiKeyBurstWindowInMs = this.configService.get<number>(
            'analytic.fraud.apiKeyBurst.windowInMs'
        )!;
        this.apiKeyBurstMinCount = this.configService.get<number>(
            'analytic.fraud.apiKeyBurst.minCount'
        )!;
        this.riskScoreCandidateLimit = this.configService.get<number>(
            'analytic.fraud.riskScore.candidateLimit'
        )!;
        this.riskScoreLookbackInMs = this.configService.get<number>(
            'analytic.fraud.riskScore.lookbackInMs'
        )!;
        this.concurrency = this.configService.get<number>(
            'analytic.fraud.concurrency'
        )!;
        this.sessionAfterAdmin = this.configService.get<number>(
            'analytic.fraud.weights.sessionAfterAdmin'
        )!;
        this.impossibleTravel = this.configService.get<number>(
            'analytic.fraud.weights.impossibleTravel'
        )!;
        this.newDeviceAfterPasswordChange = this.configService.get<number>(
            'analytic.fraud.weights.newDeviceAfterPasswordChange'
        )!;
        this.credentialStuffingIp = this.configService.get<number>(
            'analytic.fraud.weights.credentialStuffingIp'
        )!;
        this.sharedFingerprint = this.configService.get<number>(
            'analytic.fraud.weights.sharedFingerprint'
        )!;
        this.nearLockout = this.configService.get<number>(
            'analytic.fraud.weights.nearLockout'
        )!;
        this.massRegistrationIp = this.configService.get<number>(
            'analytic.fraud.weights.massRegistrationIp'
        )!;
        this.forgotPasswordAbuse = this.configService.get<number>(
            'analytic.fraud.weights.forgotPasswordAbuse'
        )!;
        this.monitorMax = this.configService.get<number>(
            'analytic.fraud.bands.monitorMax'
        )!;
        this.reviewMax = this.configService.get<number>(
            'analytic.fraud.bands.reviewMax'
        )!;
        this.elevateMax = this.configService.get<number>(
            'analytic.fraud.bands.elevateMax'
        )!;
    }

    private resolveBand(score: number): EnumAnalyticFraudBand {
        if (score <= this.monitorMax) {
            return EnumAnalyticFraudBand.monitor;
        }
        if (score <= this.reviewMax) {
            return EnumAnalyticFraudBand.review;
        }
        if (score <= this.elevateMax) {
            return EnumAnalyticFraudBand.elevate;
        }

        return EnumAnalyticFraudBand.critical;
    }

    private async getNearLockoutAttempt(): Promise<number> {
        const passwordMaxAttempt =
            await this.userAnalyticService.getPasswordMaxAttempts();

        return this.analyticFraudUtil.nearLockoutThreshold(passwordMaxAttempt);
    }

    private score(
        user: IUserAnalyticRef,
        signals: IAnalyticFraudSignalUsers,
        nearLockoutAttempt: number
    ): IAnalyticFraudRiskScore {
        const now = this.helperDateService.create();
        const checks = [
            {
                signal: EnumAnalyticFraudContributingSignal.sessionAfterAdmin,
                weight: this.sessionAfterAdmin,
                hit: signals.sessionAfterAdmin.has(user.id),
            },
            {
                signal: EnumAnalyticFraudContributingSignal.impossibleTravel,
                weight: this.impossibleTravel,
                hit: signals.impossibleTravel.has(user.id),
            },
            {
                signal: EnumAnalyticFraudContributingSignal.newDeviceAfterPasswordChange,
                weight: this.newDeviceAfterPasswordChange,
                hit: signals.newDeviceAfterPasswordChange.has(user.id),
            },
            {
                signal: EnumAnalyticFraudContributingSignal.credentialStuffingIp,
                weight: this.credentialStuffingIp,
                hit: signals.credentialStuffingIp.has(user.id),
            },
            {
                signal: EnumAnalyticFraudContributingSignal.sharedFingerprint,
                weight: this.sharedFingerprint,
                hit: signals.sharedFingerprint.has(user.id),
            },
            {
                signal: EnumAnalyticFraudContributingSignal.nearLockout,
                weight: this.nearLockout,
                hit:
                    (user.passwordLockedUntil !== null &&
                        user.passwordLockedUntil > now) ||
                    user.passwordAttempt >= nearLockoutAttempt,
            },
            {
                signal: EnumAnalyticFraudContributingSignal.massRegistrationIp,
                weight: this.massRegistrationIp,
                hit: signals.massRegistrationIp.has(user.id),
            },
            {
                signal: EnumAnalyticFraudContributingSignal.forgotPasswordAbuse,
                weight: this.forgotPasswordAbuse,
                hit: signals.forgotPasswordAbuse.has(user.id),
            },
        ];

        const contributingSignalCodes: EnumAnalyticFraudContributingSignal[] =
            [];
        let score = 0;
        for (const check of checks) {
            if (check.hit) {
                score += check.weight;
                contributingSignalCodes.push(check.signal);
            }
        }

        const band = this.resolveBand(score);

        return { userId: user.id, score, band, contributingSignalCodes };
    }

    private toSignalUsers(
        rows: IAnalyticFraudSignalRows
    ): IAnalyticFraudSignalUsers {
        return {
            sessionAfterAdmin: new Set(
                rows.sessionAfterAdmin.map(row => row.userId)
            ),
            impossibleTravel: new Set(rows.impossibleTravelUserIds),
            newDeviceAfterPasswordChange: new Set(
                rows.accountTakeover.map(row => row.userId)
            ),
            credentialStuffingIp: rows.credentialStuffingUserIds,
            sharedFingerprint: new Set(
                rows.sharedFingerprint.flatMap(row => row.userIds)
            ),
            massRegistrationIp: rows.massRegistrationUserIds,
            forgotPasswordAbuse: new Set(
                rows.forgotPasswordAbuse.map(row => row.userId)
            ),
        };
    }

    private collectCandidateIds(
        signals: IAnalyticFraudSignalUsers,
        nearLockout: IAnalyticNearLockout[],
        limit: number
    ): string[] {
        return [
            ...new Set([
                ...signals.sessionAfterAdmin,
                ...signals.impossibleTravel,
                ...signals.newDeviceAfterPasswordChange,
                ...signals.credentialStuffingIp,
                ...signals.sharedFingerprint,
                ...nearLockout.map(user => user.id),
                ...signals.massRegistrationIp,
                ...signals.forgotPasswordAbuse,
            ]),
        ].slice(0, limit);
    }

    private async groupFlaggedCredentialStuffing(
        windowMs: number
    ): Promise<Map<string, IAnalyticIpGroup>> {
        const { startDate, endDate } =
            this.analyticDateUtil.windowRange(windowMs);
        const pairs =
            await this.activityLogAnalyticService.getGroupIpUserByActions(
                [
                    EnumActivityLogAction.userLoginFailed,
                    EnumActivityLogAction.userReachMaxPasswordAttempt,
                    EnumActivityLogAction.userReachMaxMfaAttempt,
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
            await this.passwordHistoryAnalyticService.getByTypeInRange(
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
            // Sequential by design: bounded chunks, concurrent within a chunk
            const devicePromises = batch.map(change => {
                const windowEnd = this.helperDateService.forward(
                    change.createdAt,
                    Duration.fromMillis(
                        this.accountTakeoverNewDeviceAfterPasswordChangeInMs
                    )
                );
                return this.deviceAnalyticService.existsCreatedInRangeByUser(
                    change.userId,
                    change.createdAt,
                    windowEnd
                );
            });
            const hasDevicePerChange = await Promise.all(devicePromises);
            for (const [index, change] of batch.entries()) {
                if (hasDevicePerChange[index]) {
                    flagged.push({
                        userId: change.userId,
                        indicatorCodes: [
                            EnumAnalyticFraudContributingSignal.newDeviceAfterPasswordChange,
                        ],
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
        const groups =
            await this.activityLogAnalyticService.getGroupIpByActions(
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
            await this.activityLogAnalyticService.getGroupUserIdByIps(
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
        const groups =
            await this.activityLogAnalyticService.getGroupIpByActions(
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
                await this.activityLogAnalyticService.getPageByActionsInRange(
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
                // Sequential by design: bounded chunks, concurrent within a chunk
                const loginPromises = batch.map(revoke => {
                    const windowEnd = this.helperDateService.forward(
                        revoke.createdAt,
                        Duration.fromMillis(this.sessionAfterAdminRevokeInMs)
                    );
                    return this.activityLogAnalyticService.getOneByUserActionsInRange(
                        revoke.userId,
                        UserLoginAnalyticActions,
                        revoke.createdAt,
                        windowEnd
                    );
                });
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
            await this.userForgotPasswordAnalyticService.getUnusedTokenCountsByUser(
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

        return this.activityLogAnalyticService.getGroupUserByActions(
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
                await this.activityLogAnalyticService.getPageByActionsInRange(
                    [EnumActivityLogAction.userRegenerateMfaBackupCodes],
                    startDate,
                    endDate,
                    cursor
                );
            const batches = this.helperArrayService.chunk(
                page.data,
                this.concurrency
            );
            for (const batch of batches) {
                // Sequential by design: bounded chunks, concurrent within a chunk
                const devicePromises = batch.map(regeneration => {
                    const windowEnd = this.helperDateService.forward(
                        regeneration.createdAt,
                        Duration.fromMillis(this.newDeviceAfterInMs)
                    );
                    return this.deviceAnalyticService.existsCreatedInRangeByUser(
                        regeneration.userId,
                        regeneration.createdAt,
                        windowEnd
                    );
                });
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

        return this.activityLogAnalyticService.getGroupUserByActions(
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
            this.analyticAnomalyService.getImpossibleTravelUserIds(
                startDate,
                endDate
            ),
            this.computeAccountTakeover(startDate, endDate),
            this.collectCredentialStuffingUsers(
                this.credentialStuffingWindowInMs
            ),
            this.deviceAnalyticService.getSharedFingerprints(
                this.sharedFingerprintMinUsersPerFingerprint
            ),
            this.collectMassRegistrationUsers(this.massRegistrationWindowInMs),
            this.computeForgotPasswordAbuse(
                this.forgotPasswordTokenAbuseWindowInMs
            ),
        ]);

        return this.toSignalUsers({
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
        const key = this.analyticCache.buildRiskScoreKey(userId);

        return this.cacheService.readThrough(
            key,
            AnalyticFraudRiskScoreCacheSchema,
            this.analyticCache.riskScoreTtlInMs,
            async () => {
                // Sequential by design: gate before the work it guards
                const user = await this.userAnalyticService.getOneById(userId);
                if (!user) {
                    throw new UserNotFoundException();
                }

                const [signals, nearLockoutAttempt] = await Promise.all([
                    this.collectSignalUsers(),
                    this.getNearLockoutAttempt(),
                ]);

                return this.score(user, signals, nearLockoutAttempt);
            }
        );
    }

    private async scoreListed(
        user: IUserAnalyticRef,
        signals: IAnalyticFraudSignalUsers,
        nearLockoutAttempt: number
    ): Promise<IAnalyticFraudRiskScore> {
        const key = this.analyticCache.buildRiskScoreKey(user.id);

        return this.cacheService.readThrough(
            key,
            AnalyticFraudRiskScoreCacheSchema,
            this.analyticCache.riskScoreTtlInMs,
            async () => this.score(user, signals, nearLockoutAttempt)
        );
    }

    async credentialStuffingSummary(
        windowMs: number | null
    ): Promise<IAnalyticFraudCredentialStuffingSummary> {
        const window = this.analyticDateService.resolveWindow(
            windowMs,
            this.credentialStuffingWindowInMs
        );
        const key = this.analyticCache.buildFraudSummaryKey(
            EnumAnalyticFraudSignal.credentialStuffing,
            String(window)
        );

        return this.cacheService.readThrough(
            key,
            AnalyticFraudCredentialStuffingSummaryCacheSchema,
            this.analyticCache.fraudSummaryTtlInMs,
            async () => {
                const rows = await this.computeCredentialStuffing(window);

                return {
                    count: rows.length,
                    window: String(window),
                    meta: {
                        minUniqueAccounts:
                            this.credentialStuffingMinUniqueAccounts,
                    },
                };
            }
        );
    }

    async credentialStuffingList(
        windowMs: number | null,
        params: IPaginationQueryOffsetParams
    ): Promise<IResponsePaginationReturn<IAnalyticCredentialStuffing>> {
        const window = this.analyticDateService.resolveWindow(
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
        const key = this.analyticCache.buildFraudSummaryKey(
            EnumAnalyticFraudSignal.accountTakeover,
            window
        );

        return this.cacheService.readThrough(
            key,
            AnalyticFraudSummaryCacheSchema,
            this.analyticCache.fraudSummaryTtlInMs,
            async () => {
                const rows = await this.computeAccountTakeover(
                    startDate,
                    endDate
                );

                return {
                    count: rows.length,
                    window,
                };
            }
        );
    }

    async accountTakeoverList(
        startDate: Date,
        endDate: Date,
        params: IPaginationQueryOffsetParams
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
        const window = this.analyticDateService.resolveWindow(
            windowMs,
            this.massRegistrationWindowInMs
        );
        const key = this.analyticCache.buildFraudSummaryKey(
            EnumAnalyticFraudSignal.massRegistration,
            String(window)
        );

        return this.cacheService.readThrough(
            key,
            AnalyticFraudSummaryCacheSchema,
            this.analyticCache.fraudSummaryTtlInMs,
            async () => {
                const rows = await this.computeMassRegistration(window);

                return {
                    count: rows.length,
                    window: String(window),
                };
            }
        );
    }

    async massRegistrationList(
        windowMs: number | null,
        params: IPaginationQueryOffsetParams
    ): Promise<IResponsePaginationReturn<IAnalyticMassRegistration>> {
        const window = this.analyticDateService.resolveWindow(
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
        const window = this.analyticDateService.resolveWindow(
            windowMs,
            this.passwordResetEnumerationWindowInMs
        );
        const key = this.analyticCache.buildFraudSummaryKey(
            EnumAnalyticFraudSignal.passwordResetEnumeration,
            String(window)
        );

        return this.cacheService.readThrough(
            key,
            AnalyticFraudSummaryCacheSchema,
            this.analyticCache.fraudSummaryTtlInMs,
            async () => {
                const rows = await this.computePasswordResetEnumeration(window);

                return {
                    count: rows.length,
                    window: String(window),
                };
            }
        );
    }

    async passwordResetEnumerationList(
        windowMs: number | null,
        params: IPaginationQueryOffsetParams
    ): Promise<IResponsePaginationReturn<IAnalyticPasswordResetEnumeration>> {
        const window = this.analyticDateService.resolveWindow(
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
        const key = this.analyticCache.buildFraudSummaryKey(
            EnumAnalyticFraudSignal.sharedFingerprint,
            AnalyticCacheEmptyToken
        );

        return this.cacheService.readThrough(
            key,
            AnalyticFraudSummaryCacheSchema,
            this.analyticCache.fraudSummaryTtlInMs,
            async () => {
                const rows =
                    await this.deviceAnalyticService.getSharedFingerprints(
                        this.sharedFingerprintMinUsersPerFingerprint
                    );

                return {
                    count: rows.length,
                    window: null,
                };
            }
        );
    }

    async sharedFingerprintList(
        params: IPaginationQueryOffsetParams
    ): Promise<IResponsePaginationReturn<IAnalyticSharedFingerprint>> {
        const rows = await this.deviceAnalyticService.getSharedFingerprints(
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
        const key = this.analyticCache.buildFraudSummaryKey(
            EnumAnalyticFraudSignal.sessionAfterAdmin,
            window
        );

        return this.cacheService.readThrough(
            key,
            AnalyticFraudSummaryCacheSchema,
            this.analyticCache.fraudSummaryTtlInMs,
            async () => {
                const rows = await this.computeSessionAfterAdmin(
                    startDate,
                    endDate
                );

                return {
                    count: rows.length,
                    window,
                };
            }
        );
    }

    async sessionAfterAdminList(
        startDate: Date,
        endDate: Date,
        params: IPaginationQueryOffsetParams
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
        const window = this.analyticDateService.resolveWindow(
            windowMs,
            this.forgotPasswordTokenAbuseWindowInMs
        );
        const key = this.analyticCache.buildFraudSummaryKey(
            EnumAnalyticFraudSignal.forgotPasswordTokenAbuse,
            String(window)
        );

        return this.cacheService.readThrough(
            key,
            AnalyticFraudSummaryCacheSchema,
            this.analyticCache.fraudSummaryTtlInMs,
            async () => {
                const rows = await this.computeForgotPasswordAbuse(window);

                return {
                    count: rows.length,
                    window: String(window),
                };
            }
        );
    }

    async forgotPasswordTokenAbuseList(
        windowMs: number | null,
        params: IPaginationQueryOffsetParams
    ): Promise<IResponsePaginationReturn<IAnalyticForgotPasswordAbuse>> {
        const window = this.analyticDateService.resolveWindow(
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
        const window = this.analyticDateService.resolveWindow(
            windowMs,
            this.refreshSpikeWindowInMs
        );
        const key = this.analyticCache.buildFraudSummaryKey(
            EnumAnalyticFraudSignal.refreshSpike,
            String(window)
        );

        return this.cacheService.readThrough(
            key,
            AnalyticFraudSummaryCacheSchema,
            this.analyticCache.fraudSummaryTtlInMs,
            async () => {
                const rows = await this.computeRefreshSpike(window);

                return {
                    count: rows.length,
                    window: String(window),
                };
            }
        );
    }

    async refreshSpikeList(
        windowMs: number | null,
        params: IPaginationQueryOffsetParams
    ): Promise<IResponsePaginationReturn<IAnalyticRefreshSpike>> {
        const window = this.analyticDateService.resolveWindow(
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
        const window = this.analyticDateService.resolveWindow(
            windowMs,
            this.backupCodeNewDeviceWindowInMs
        );
        const key = this.analyticCache.buildFraudSummaryKey(
            EnumAnalyticFraudSignal.backupCodeNewDevice,
            String(window)
        );

        return this.cacheService.readThrough(
            key,
            AnalyticFraudSummaryCacheSchema,
            this.analyticCache.fraudSummaryTtlInMs,
            async () => {
                const rows = await this.computeBackupCodeNewDevice(window);

                return {
                    count: rows.length,
                    window: String(window),
                };
            }
        );
    }

    async backupCodeNewDeviceList(
        windowMs: number | null,
        params: IPaginationQueryOffsetParams
    ): Promise<IResponsePaginationReturn<IAnalyticBackupCodeNewDevice>> {
        const window = this.analyticDateService.resolveWindow(
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
        const window = this.analyticDateService.resolveWindow(
            windowMs,
            this.apiKeyBurstWindowInMs
        );
        const key = this.analyticCache.buildFraudSummaryKey(
            EnumAnalyticFraudSignal.apiKeyBurst,
            String(window)
        );

        return this.cacheService.readThrough(
            key,
            AnalyticFraudSummaryCacheSchema,
            this.analyticCache.fraudSummaryTtlInMs,
            async () => {
                const rows = await this.computeApiKeyBurst(window);

                return {
                    count: rows.length,
                    window: String(window),
                };
            }
        );
    }

    async apiKeyBurstList(
        windowMs: number | null,
        params: IPaginationQueryOffsetParams
    ): Promise<IResponsePaginationReturn<IAnalyticApiKeyBurst>> {
        const window = this.analyticDateService.resolveWindow(
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
        params: IPaginationQueryOffsetParams
    ): Promise<IResponsePaginationReturn<IAnalyticFraudRiskScore>> {
        const now = this.helperDateService.create();
        const [signals, nearLockoutAttempt] = await Promise.all([
            this.collectSignalUsers(),
            this.getNearLockoutAttempt(),
        ]);
        const nearLockout = await this.userAnalyticService.getNearLockout(
            nearLockoutAttempt,
            now,
            this.riskScoreCandidateLimit
        );

        const candidateIds = this.collectCandidateIds(
            signals,
            nearLockout,
            this.riskScoreCandidateLimit
        );
        const candidates =
            await this.userAnalyticService.getManyByIds(candidateIds);

        const all: IAnalyticFraudRiskScore[] = [];
        const batches = this.helperArrayService.chunk(
            candidates,
            this.concurrency
        );
        for (const batch of batches) {
            // Sequential by design: bounded chunks, concurrent within a chunk
            const batchScores = await Promise.all(
                batch.map(u => this.scoreListed(u, signals, nearLockoutAttempt))
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
