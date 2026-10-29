import { HelperArrayService } from '@common/helper/services/helper.array.service';
import { HelperDateService } from '@common/helper/services/helper.date.service';
import type { IPaginationQueryOffsetParams } from '@common/pagination/interfaces/pagination.interface';
import { PaginationService } from '@common/pagination/services/pagination.service';
import type { IResponsePaginationReturn } from '@common/response/interfaces/response.interface';
import { ActivityLogAnalyticDomain } from '@modules/activity-log/domains/activity-log.analytic.domain';
import { AnalyticCache } from '@modules/analytic/caches/analytic.cache';
import { AnalyticAnomalyDomain } from '@modules/analytic/domains/analytic.anomaly.domain';
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
    IAnalyticCredentialStuffingGroup,
    IAnalyticForgotPasswordAbuse,
    IAnalyticFraudCredentialStuffingSummary,
    IAnalyticFraudRiskScore,
    IAnalyticFraudSignalUsers,
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
import type { IUserAnalyticRef } from '@modules/user/interfaces/user.interface';
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
    private readonly refreshSpikeMinCount: number;
    private readonly backupCodeNewDeviceWindowInMs: number;
    private readonly apiKeyBurstWindowInMs: number;
    private readonly apiKeyBurstMinCount: number;
    private readonly weightSessionAfterAdmin: number;
    private readonly weightImpossibleTravel: number;
    private readonly weightNewDeviceAfterPasswordChange: number;
    private readonly weightCredentialStuffingIp: number;
    private readonly weightSharedFingerprint: number;
    private readonly weightNearLockout: number;
    private readonly weightMassRegistrationIp: number;
    private readonly weightForgotPasswordAbuse: number;
    private readonly nearLockoutAttempt: number;
    private readonly riskScoreCandidateLimit: number;
    private readonly riskScoreLookbackInMs: number;
    private readonly bandMonitorMax: number;
    private readonly bandReviewMax: number;
    private readonly bandElevateMax: number;
    private readonly concurrency: number;

    constructor(
        private readonly analyticCache: AnalyticCache,
        private readonly analyticDateUtil: AnalyticDateUtil,
        private readonly analyticSortUtil: AnalyticSortUtil,
        private readonly paginationService: PaginationService,
        private readonly configService: ConfigService,
        private readonly helperDateService: HelperDateService,
        private readonly helperArrayService: HelperArrayService,
        private readonly analyticAnomalyDomain: AnalyticAnomalyDomain,
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
        this.refreshSpikeMinCount = this.configService.get<number>(
            'analytic.fraud.refreshSpike.minCount'
        )!;
        this.backupCodeNewDeviceWindowInMs = this.configService.get<number>(
            'analytic.fraud.backupCodeNewDevice.windowInMs'
        )!;
        this.apiKeyBurstWindowInMs = this.configService.get<number>(
            'analytic.fraud.apiKeyBurst.windowInMs'
        )!;
        this.apiKeyBurstMinCount = this.configService.get<number>(
            'analytic.fraud.apiKeyBurst.minCount'
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
        const passwordMaxAttempt = this.configService.get<number>(
            'auth.password.maxAttempt'
        )!;
        const nearLockoutOffset = this.configService.get<number>(
            'analytic.anomaly.failedLoginSpike.nearLockoutOffset'
        )!;
        this.nearLockoutAttempt = passwordMaxAttempt - nearLockoutOffset;
        this.riskScoreCandidateLimit = this.configService.get<number>(
            'analytic.fraud.riskScore.candidateLimit'
        )!;
        this.riskScoreLookbackInMs = this.configService.get<number>(
            'analytic.fraud.riskScore.lookbackInMs'
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
        this.concurrency = this.configService.get<number>(
            'analytic.fraud.concurrency'
        )!;
    }

    private resolveWindow(
        windowMs: number | null,
        defaultWindowInMs: number
    ): number {
        return windowMs ?? defaultWindowInMs;
    }

    private resolveBand(score: number): EnumAnalyticFraudBand {
        if (score <= this.bandMonitorMax) {
            return EnumAnalyticFraudBand.monitor;
        }
        if (score <= this.bandReviewMax) {
            return EnumAnalyticFraudBand.review;
        }
        if (score <= this.bandElevateMax) {
            return EnumAnalyticFraudBand.elevate;
        }
        return EnumAnalyticFraudBand.critical;
    }

    private async groupFlaggedCredentialStuffing(
        windowMs: number
    ): Promise<Map<string, IAnalyticCredentialStuffingGroup>> {
        const end = this.helperDateService.create();
        const start = this.helperDateService.backward(
            end,
            Duration.fromMillis(windowMs)
        );
        const activityLogs =
            await this.userLoginAnalyticDomain.getFailedLoginActivityLogs(
                start,
                end
            );
        const map = new Map<string, IAnalyticCredentialStuffingGroup>();
        for (const activityLog of activityLogs) {
            const ip = activityLog.ipAddress ?? 'unknown';
            if (!map.has(ip)) {
                map.set(ip, { users: new Set(), failCount: 0 });
            }
            const row = map.get(ip)!;
            row.users.add(activityLog.userId);
            row.failCount++;
        }
        return new Map(
            [...map.entries()].filter(
                ([, v]) =>
                    v.users.size >= this.credentialStuffingMinUniqueAccounts
            )
        );
    }

    private async computeCredentialStuffing(
        windowMs: number
    ): Promise<IAnalyticCredentialStuffing[]> {
        const flagged = await this.groupFlaggedCredentialStuffing(windowMs);
        return [...flagged.entries()].map(([ipAddress, v]) => ({
            ipAddress,
            uniqueUsers: v.users.size,
            failCount: v.failCount,
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
        const changes = await this.userPasswordAnalyticDomain.getProfileChanges(
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
                return this.deviceAnalyticDomain.getCreatedInRange(
                    change.createdAt,
                    windowEnd
                );
            });
            // Sequential by design: bounded chunks, concurrent within a chunk
            const devicesPerChange = await Promise.all(devicePromises);
            for (const [index, change] of batch.entries()) {
                const forUser = devicesPerChange[index]!.filter(
                    d => d.userId === change.userId
                );
                if (forUser.length > 0) {
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
        const end = this.helperDateService.create();
        const start = this.helperDateService.backward(
            end,
            Duration.fromMillis(windowMs)
        );
        const groups = await this.activityLogAnalyticDomain.getGroupIpByActions(
            AnalyticMassRegistrationActions,
            start,
            end,
            this.massRegistrationMinAccountsPerIp
        );
        return groups.map(group => ({
            key: group.ipAddress,
            count: group.count,
        }));
    }

    private async collectMassRegistrationUsers(
        windowMs: number
    ): Promise<Set<string>> {
        const flagged = await this.computeMassRegistration(windowMs);
        if (flagged.length === 0) {
            return new Set();
        }
        const end = this.helperDateService.create();
        const start = this.helperDateService.backward(
            end,
            Duration.fromMillis(windowMs)
        );
        const ips = new Set(flagged.map(row => row.key));
        const created =
            await this.activityLogAnalyticDomain.getManyByActionsInRange(
                AnalyticMassRegistrationActions,
                start,
                end
            );
        return new Set(
            created
                .filter(
                    activityLog =>
                        activityLog.ipAddress !== null &&
                        ips.has(activityLog.ipAddress)
                )
                .map(activityLog => activityLog.userId)
        );
    }

    private async computePasswordResetEnumeration(
        windowMs: number
    ): Promise<IAnalyticPasswordResetEnumeration[]> {
        const end = this.helperDateService.create();
        const start = this.helperDateService.backward(
            end,
            Duration.fromMillis(windowMs)
        );
        const groups = await this.activityLogAnalyticDomain.getGroupIpByActions(
            [EnumActivityLogAction.userForgotPassword],
            start,
            end,
            this.passwordResetEnumerationMinRequestsPerIp
        );
        return groups.map(group => ({
            key: group.ipAddress,
            count: group.count,
        }));
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
        const batches = this.helperArrayService.chunk(
            revokes,
            this.concurrency
        );
        for (const batch of batches) {
            const loginPromises = batch.map(revoke => {
                const windowEnd = this.helperDateService.forward(
                    revoke.createdAt,
                    Duration.fromMillis(this.sessionAfterAdminRevokeInMs)
                );
                return this.userLoginAnalyticDomain.getLoginActivityLogs(
                    revoke.createdAt,
                    windowEnd
                );
            });
            // Sequential by design: bounded chunks, concurrent within a chunk
            const loginsPerRevoke = await Promise.all(loginPromises);
            for (const [index, revoke] of batch.entries()) {
                const hit = loginsPerRevoke[index]!.find(
                    l => l.userId === revoke.userId
                );
                if (hit) {
                    flagged.push({
                        userId: revoke.userId,
                        revokedAt: revoke.createdAt,
                        loginAt: hit.createdAt,
                    });
                }
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
        const activityLogs =
            await this.activityLogAnalyticDomain.getManyByActionsInRange(
                [EnumActivityLogAction.userRefreshToken],
                start,
                end
            );
        const map = new Map<string, number>();
        for (const activityLog of activityLogs) {
            map.set(activityLog.userId, (map.get(activityLog.userId) ?? 0) + 1);
        }
        return [...map.entries()]
            .filter(([, count]) => count >= this.refreshSpikeMinCount)
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
        const batches = this.helperArrayService.chunk(
            regenerations,
            this.concurrency
        );
        for (const batch of batches) {
            const devicePromises = batch.map(regeneration => {
                const windowEnd = this.helperDateService.forward(
                    regeneration.createdAt,
                    Duration.fromMillis(windowMs)
                );
                return this.deviceAnalyticDomain.getCreatedInRange(
                    regeneration.createdAt,
                    windowEnd
                );
            });
            // Sequential by design: bounded chunks, concurrent within a chunk
            const devicesPerRegeneration = await Promise.all(devicePromises);
            for (const [index, regeneration] of batch.entries()) {
                if (
                    devicesPerRegeneration[index]!.some(
                        d => d.userId === regeneration.userId
                    )
                ) {
                    flagged.push({
                        userId: regeneration.userId,
                        regeneratedAt: regeneration.createdAt,
                    });
                }
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
        const activityLogs =
            await this.activityLogAnalyticDomain.getManyByActionsInRange(
                [
                    EnumActivityLogAction.adminApiKeyCreate,
                    EnumActivityLogAction.adminApiKeyReset,
                ],
                start,
                end
            );
        const map = new Map<string, number>();
        for (const activityLog of activityLogs) {
            map.set(activityLog.userId, (map.get(activityLog.userId) ?? 0) + 1);
        }
        return [...map.entries()]
            .filter(([, count]) => count >= this.apiKeyBurstMinCount)
            .map(([userId, count]) => ({ userId, count }));
    }

    private async collectSignalUsers(): Promise<IAnalyticFraudSignalUsers> {
        const end = this.helperDateService.create();
        const start = this.helperDateService.backward(
            end,
            Duration.fromMillis(this.riskScoreLookbackInMs)
        );
        const [
            sessionAfterAdmin,
            impossibleTravel,
            accountTakeover,
            credentialStuffing,
            shared,
            massRegistration,
            forgotPasswordAbuse,
        ] = await Promise.all([
            this.computeSessionAfterAdmin(start, end),
            this.analyticAnomalyDomain.getImpossibleTravelUserIds(start, end),
            this.computeAccountTakeover(start, end),
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

        return {
            sessionAfterAdmin: new Set(sessionAfterAdmin.map(r => r.userId)),
            impossibleTravel: new Set(impossibleTravel),
            newDeviceAfterPasswordChange: new Set(
                accountTakeover.map(r => r.userId)
            ),
            credentialStuffingIp: credentialStuffing,
            sharedFingerprint: new Set(shared.flatMap(s => s.userIds)),
            massRegistrationIp: massRegistration,
            forgotPasswordAbuse: new Set(
                forgotPasswordAbuse.map(r => r.userId)
            ),
        };
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
        const checks = [
            {
                signal: EnumAnalyticFraudContributingSignal.sessionAfterAdmin,
                weight: this.weightSessionAfterAdmin,
                hit: signals.sessionAfterAdmin.has(user.id),
            },
            {
                signal: EnumAnalyticFraudContributingSignal.impossibleTravel,
                weight: this.weightImpossibleTravel,
                hit: signals.impossibleTravel.has(user.id),
            },
            {
                signal: EnumAnalyticFraudContributingSignal.newDeviceAfterPasswordChange,
                weight: this.weightNewDeviceAfterPasswordChange,
                hit: signals.newDeviceAfterPasswordChange.has(user.id),
            },
            {
                signal: EnumAnalyticFraudContributingSignal.credentialStuffingIp,
                weight: this.weightCredentialStuffingIp,
                hit: signals.credentialStuffingIp.has(user.id),
            },
            {
                signal: EnumAnalyticFraudContributingSignal.sharedFingerprint,
                weight: this.weightSharedFingerprint,
                hit: signals.sharedFingerprint.has(user.id),
            },
            {
                signal: EnumAnalyticFraudContributingSignal.nearLockout,
                weight: this.weightNearLockout,
                hit: (user.passwordAttempt ?? 0) >= this.nearLockoutAttempt,
            },
            {
                signal: EnumAnalyticFraudContributingSignal.massRegistrationIp,
                weight: this.weightMassRegistrationIp,
                hit: signals.massRegistrationIp.has(user.id),
            },
            {
                signal: EnumAnalyticFraudContributingSignal.forgotPasswordAbuse,
                weight: this.weightForgotPasswordAbuse,
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
        const result: IAnalyticFraudRiskScore = {
            userId: user.id,
            score,
            band,
            contributingSignalCodes,
        };
        await this.analyticCache.setRiskScore(user.id, result);
        return result;
    }

    async credentialStuffingSummary(
        windowMs: number | null
    ): Promise<IAnalyticFraudCredentialStuffingSummary> {
        const window = this.resolveWindow(
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
        return this.scoreCached(userId);
    }

    async riskScores(
        minScore: number | null,
        params: IPaginationQueryOffsetParams<Prisma.UserWhereInput>
    ): Promise<IResponsePaginationReturn<IAnalyticFraudRiskScore>> {
        const [signals, nearLockout] = await Promise.all([
            this.collectSignalUsers(),
            this.userAnalyticDomain.getNearLockout(this.nearLockoutAttempt),
        ]);

        const candidateIds = [
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
        ].slice(0, this.riskScoreCandidateLimit);
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
