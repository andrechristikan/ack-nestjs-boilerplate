import { CacheService } from '@common/cache/services/cache.service';
import type { IPaginationQueryOffsetParams } from '@common/pagination/interfaces/pagination.interface';
import type { IResponsePaginationReturn } from '@common/response/interfaces/response.interface';
import { AnalyticCache } from '@modules/analytic/caches/analytic.cache';
import { AnalyticFraudRepository } from '@modules/analytic/repositories/analytic.fraud.repository';
import { AnalyticSnapshotService } from '@modules/analytic/services/analytic.snapshot.service';
import {
    AnalyticFraudCredentialStuffingSummaryCacheSchema,
    AnalyticFraudSummaryCacheSchema,
    AnalyticRiskScoreSnapshotDataSchema,
    AnalyticSharedFingerprintSnapshotDataSchema,
    AnalyticSnapshotNullMetaSchema,
} from '@modules/analytic/constants/analytic.constant';
import {
    EnumAnalyticFraudBand,
    EnumAnalyticFraudContributingSignal,
    EnumAnalyticFraudSignal,
} from '@modules/analytic/enums/analytic.enum';
import type {
    IAnalyticAccountTakeover,
    IAnalyticCredentialStuffing,
    IAnalyticForgotPasswordAbuse,
    IAnalyticFraudCredentialStuffingSummary,
    IAnalyticFraudRiskScore,
    IAnalyticFraudRiskScoreUser,
    IAnalyticFraudSummary,
    IAnalyticMassRegistration,
    IAnalyticPasswordResetEnumeration,
    IAnalyticSessionAfterAdmin,
    IAnalyticSharedFingerprint,
    IAnalyticSnapshotResult,
} from '@modules/analytic/interfaces/analytic.interface';
import { AnalyticDateUtil } from '@modules/analytic/utils/analytic.date.util';
import { AnalyticFraudUtil } from '@modules/analytic/utils/analytic.fraud.util';
import { UserNotFoundException } from '@modules/user/exceptions/user.not-found.exception';
import {
    EnumFeatureFlagKey,
    EnumFeatureFlagMetadataKey,
} from '@modules/feature-flag/enums/feature-flag.enum';
import { FeatureFlagService } from '@modules/feature-flag/services/feature-flag.service';
import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { EnumAnalyticSnapshotSignal } from '@generated/prisma-client/client';

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
    private readonly riskScoreLookbackInMs: number;
    private readonly impossibleTravelMinDistanceKm: number;
    private readonly impossibleTravelMaxDeltaInMs: number;
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
        private readonly analyticDateUtil: AnalyticDateUtil,
        private readonly analyticFraudUtil: AnalyticFraudUtil,
        private readonly configService: ConfigService,
        private readonly featureFlagService: FeatureFlagService,
        private readonly analyticSnapshotService: AnalyticSnapshotService,
        private readonly analyticFraudRepository: AnalyticFraudRepository
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
        this.riskScoreLookbackInMs = this.configService.get<number>(
            'analytic.fraud.riskScore.lookbackInMs'
        )!;
        this.impossibleTravelMinDistanceKm = this.configService.get<number>(
            'analytic.anomaly.impossibleTravel.minDistanceKm'
        )!;
        this.impossibleTravelMaxDeltaInMs = this.configService.get<number>(
            'analytic.anomaly.impossibleTravel.maxDeltaInMs'
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

    private async getNearLockoutAttempt(): Promise<number> {
        const passwordMaxAttempt =
            await this.featureFlagService.getMetadataNumber(
                EnumFeatureFlagKey.loginWithCredential,
                EnumFeatureFlagMetadataKey.passwordMaxAttempts
            );

        return this.analyticFraudUtil.nearLockoutThreshold(passwordMaxAttempt);
    }

    async credentialStuffingSummary(): Promise<IAnalyticFraudCredentialStuffingSummary> {
        const key = this.analyticCache.buildFraudSummaryKey(
            EnumAnalyticFraudSignal.credentialStuffing,
            String(this.credentialStuffingWindowInMs)
        );

        return this.cacheService.readThrough(
            key,
            AnalyticFraudCredentialStuffingSummaryCacheSchema,
            this.analyticCache.liveSummaryTtlInMs,
            async () => {
                const range = this.analyticDateUtil.windowRange(
                    this.credentialStuffingWindowInMs
                );
                const count =
                    await this.analyticFraudRepository.countCredentialStuffing(
                        range,
                        this.credentialStuffingMinUniqueAccounts
                    );

                return {
                    count,
                    windowStart: range.startDate,
                    windowEnd: range.endDate,
                    computedAt: null,
                    metadata: {
                        minUniqueAccounts:
                            this.credentialStuffingMinUniqueAccounts,
                    },
                };
            }
        );
    }

    async credentialStuffingList(
        params: IPaginationQueryOffsetParams
    ): Promise<IResponsePaginationReturn<IAnalyticCredentialStuffing>> {
        const range = this.analyticDateUtil.windowRange(
            this.credentialStuffingWindowInMs
        );

        return this.analyticFraudRepository.findCredentialStuffingOffset(
            range,
            this.credentialStuffingMinUniqueAccounts,
            params
        );
    }

    async accountTakeoverSummary(): Promise<IAnalyticFraudSummary> {
        const key = this.analyticCache.buildFraudSummaryKey(
            EnumAnalyticFraudSignal.accountTakeover,
            String(this.riskScoreLookbackInMs)
        );

        return this.cacheService.readThrough(
            key,
            AnalyticFraudSummaryCacheSchema,
            this.analyticCache.liveSummaryTtlInMs,
            async () => {
                const range = this.analyticDateUtil.windowRange(
                    this.riskScoreLookbackInMs
                );
                const count =
                    await this.analyticFraudRepository.countAccountTakeover(
                        range,
                        this.accountTakeoverNewDeviceAfterPasswordChangeInMs
                    );

                return {
                    count,
                    windowStart: range.startDate,
                    windowEnd: range.endDate,
                    computedAt: null,
                };
            }
        );
    }

    async accountTakeoverList(
        params: IPaginationQueryOffsetParams
    ): Promise<IResponsePaginationReturn<IAnalyticAccountTakeover>> {
        const range = this.analyticDateUtil.windowRange(
            this.riskScoreLookbackInMs
        );

        return this.analyticFraudRepository.findAccountTakeoverOffset(
            range,
            this.accountTakeoverNewDeviceAfterPasswordChangeInMs,
            params
        );
    }

    async massRegistrationSummary(): Promise<IAnalyticFraudSummary> {
        const key = this.analyticCache.buildFraudSummaryKey(
            EnumAnalyticFraudSignal.massRegistration,
            String(this.massRegistrationWindowInMs)
        );

        return this.cacheService.readThrough(
            key,
            AnalyticFraudSummaryCacheSchema,
            this.analyticCache.liveSummaryTtlInMs,
            async () => {
                const range = this.analyticDateUtil.windowRange(
                    this.massRegistrationWindowInMs
                );
                const count =
                    await this.analyticFraudRepository.countMassRegistration(
                        range,
                        this.massRegistrationMinAccountsPerIp
                    );

                return {
                    count,
                    windowStart: range.startDate,
                    windowEnd: range.endDate,
                    computedAt: null,
                };
            }
        );
    }

    async massRegistrationList(
        params: IPaginationQueryOffsetParams
    ): Promise<IResponsePaginationReturn<IAnalyticMassRegistration>> {
        const range = this.analyticDateUtil.windowRange(
            this.massRegistrationWindowInMs
        );

        return this.analyticFraudRepository.findMassRegistrationOffset(
            range,
            this.massRegistrationMinAccountsPerIp,
            params
        );
    }

    async passwordResetEnumerationSummary(): Promise<IAnalyticFraudSummary> {
        const key = this.analyticCache.buildFraudSummaryKey(
            EnumAnalyticFraudSignal.passwordResetEnumeration,
            String(this.passwordResetEnumerationWindowInMs)
        );

        return this.cacheService.readThrough(
            key,
            AnalyticFraudSummaryCacheSchema,
            this.analyticCache.liveSummaryTtlInMs,
            async () => {
                const range = this.analyticDateUtil.windowRange(
                    this.passwordResetEnumerationWindowInMs
                );
                const count =
                    await this.analyticFraudRepository.countPasswordResetEnumeration(
                        range,
                        this.passwordResetEnumerationMinRequestsPerIp
                    );

                return {
                    count,
                    windowStart: range.startDate,
                    windowEnd: range.endDate,
                    computedAt: null,
                };
            }
        );
    }

    async passwordResetEnumerationList(
        params: IPaginationQueryOffsetParams
    ): Promise<IResponsePaginationReturn<IAnalyticPasswordResetEnumeration>> {
        const range = this.analyticDateUtil.windowRange(
            this.passwordResetEnumerationWindowInMs
        );

        return this.analyticFraudRepository.findPasswordResetEnumerationOffset(
            range,
            this.passwordResetEnumerationMinRequestsPerIp,
            params
        );
    }

    async computeSharedFingerprint(): Promise<
        IAnalyticSnapshotResult<IAnalyticSharedFingerprint, null>
    > {
        const items = await this.analyticFraudRepository.findSharedFingerprints(
            this.sharedFingerprintMinUsersPerFingerprint
        );

        return {
            items: items.map(row => ({
                key: row.fingerprint,
                value: row.userCount,
                occurredAt: null,
                data: row,
            })),
            metadata: null,
            windowStart: null,
            windowEnd: null,
        };
    }

    async sharedFingerprintSummary(): Promise<IAnalyticFraudSummary> {
        const { count, windowStart, windowEnd, computedAt } =
            await this.analyticSnapshotService.getSummary(
                EnumAnalyticSnapshotSignal.sharedFingerprint,
                AnalyticSnapshotNullMetaSchema
            );

        return { count, windowStart, windowEnd, computedAt };
    }

    async sharedFingerprintList(
        params: IPaginationQueryOffsetParams
    ): Promise<IResponsePaginationReturn<IAnalyticSharedFingerprint>> {
        return this.analyticSnapshotService.getListOffset(
            EnumAnalyticSnapshotSignal.sharedFingerprint,
            params,
            null,
            AnalyticSharedFingerprintSnapshotDataSchema
        );
    }

    async sessionAfterAdminSummary(): Promise<IAnalyticFraudSummary> {
        const key = this.analyticCache.buildFraudSummaryKey(
            EnumAnalyticFraudSignal.sessionAfterAdmin,
            String(this.riskScoreLookbackInMs)
        );

        return this.cacheService.readThrough(
            key,
            AnalyticFraudSummaryCacheSchema,
            this.analyticCache.liveSummaryTtlInMs,
            async () => {
                const range = this.analyticDateUtil.windowRange(
                    this.riskScoreLookbackInMs
                );
                const count =
                    await this.analyticFraudRepository.countSessionAfterAdmin(
                        range,
                        this.sessionAfterAdminRevokeInMs
                    );

                return {
                    count,
                    windowStart: range.startDate,
                    windowEnd: range.endDate,
                    computedAt: null,
                };
            }
        );
    }

    async sessionAfterAdminList(
        params: IPaginationQueryOffsetParams
    ): Promise<IResponsePaginationReturn<IAnalyticSessionAfterAdmin>> {
        const range = this.analyticDateUtil.windowRange(
            this.riskScoreLookbackInMs
        );

        return this.analyticFraudRepository.findSessionAfterAdminOffset(
            range,
            this.sessionAfterAdminRevokeInMs,
            params
        );
    }

    async forgotPasswordTokenAbuseSummary(): Promise<IAnalyticFraudSummary> {
        const key = this.analyticCache.buildFraudSummaryKey(
            EnumAnalyticFraudSignal.forgotPasswordTokenAbuse,
            String(this.forgotPasswordTokenAbuseWindowInMs)
        );

        return this.cacheService.readThrough(
            key,
            AnalyticFraudSummaryCacheSchema,
            this.analyticCache.liveSummaryTtlInMs,
            async () => {
                const range = this.analyticDateUtil.windowRange(
                    this.forgotPasswordTokenAbuseWindowInMs
                );
                const count =
                    await this.analyticFraudRepository.countForgotPasswordAbuse(
                        range,
                        this.forgotPasswordTokenAbuseMinUnusedTokens
                    );

                return {
                    count,
                    windowStart: range.startDate,
                    windowEnd: range.endDate,
                    computedAt: null,
                };
            }
        );
    }

    async forgotPasswordTokenAbuseList(
        params: IPaginationQueryOffsetParams
    ): Promise<IResponsePaginationReturn<IAnalyticForgotPasswordAbuse>> {
        const range = this.analyticDateUtil.windowRange(
            this.forgotPasswordTokenAbuseWindowInMs
        );

        return this.analyticFraudRepository.findForgotPasswordAbuseOffset(
            range,
            this.forgotPasswordTokenAbuseMinUnusedTokens,
            params
        );
    }

    async computeRiskScore(): Promise<
        IAnalyticSnapshotResult<IAnalyticFraudRiskScore, null>
    > {
        const { startDate, endDate } = this.analyticDateUtil.windowRange(
            this.riskScoreLookbackInMs
        );
        const nearLockoutMinAttempt = await this.getNearLockoutAttempt();
        const items =
            await this.analyticFraudRepository.findRiskScoreCandidates({
                now: endDate,
                nearLockoutMinAttempt,
                riskScore: { lookbackInMs: this.riskScoreLookbackInMs },
                credentialStuffing: {
                    windowInMs: this.credentialStuffingWindowInMs,
                    minUniqueAccounts: this.credentialStuffingMinUniqueAccounts,
                },
                accountTakeover: {
                    newDeviceAfterPasswordChangeInMs:
                        this.accountTakeoverNewDeviceAfterPasswordChangeInMs,
                },
                massRegistration: {
                    windowInMs: this.massRegistrationWindowInMs,
                    minAccountsPerIp: this.massRegistrationMinAccountsPerIp,
                },
                sharedFingerprint: {
                    minUsersPerFingerprint:
                        this.sharedFingerprintMinUsersPerFingerprint,
                },
                sessionAfterAdmin: {
                    sessionAfterAdminRevokeInMs:
                        this.sessionAfterAdminRevokeInMs,
                },
                forgotPasswordTokenAbuse: {
                    windowInMs: this.forgotPasswordTokenAbuseWindowInMs,
                    minUnusedTokens:
                        this.forgotPasswordTokenAbuseMinUnusedTokens,
                },
                impossibleTravel: {
                    minDistanceKm: this.impossibleTravelMinDistanceKm,
                    maxDeltaInMs: this.impossibleTravelMaxDeltaInMs,
                },
                weights: {
                    [EnumAnalyticFraudContributingSignal.sessionAfterAdmin]:
                        this.sessionAfterAdmin,
                    [EnumAnalyticFraudContributingSignal.impossibleTravel]:
                        this.impossibleTravel,
                    [EnumAnalyticFraudContributingSignal.newDeviceAfterPasswordChange]:
                        this.newDeviceAfterPasswordChange,
                    [EnumAnalyticFraudContributingSignal.credentialStuffingIp]:
                        this.credentialStuffingIp,
                    [EnumAnalyticFraudContributingSignal.sharedFingerprint]:
                        this.sharedFingerprint,
                    [EnumAnalyticFraudContributingSignal.nearLockout]:
                        this.nearLockout,
                    [EnumAnalyticFraudContributingSignal.massRegistrationIp]:
                        this.massRegistrationIp,
                    [EnumAnalyticFraudContributingSignal.forgotPasswordAbuse]:
                        this.forgotPasswordAbuse,
                },
                bands: {
                    monitorMax: this.monitorMax,
                    reviewMax: this.reviewMax,
                    elevateMax: this.elevateMax,
                },
            });

        return {
            items,
            metadata: null,
            windowStart: startDate,
            windowEnd: endDate,
        };
    }

    async riskScore(userId: string): Promise<IAnalyticFraudRiskScoreUser> {
        const [{ item, computedAt }, exists] = await Promise.all([
            this.analyticSnapshotService.getOneByKey(
                EnumAnalyticSnapshotSignal.riskScore,
                userId,
                AnalyticRiskScoreSnapshotDataSchema
            ),
            this.analyticFraudRepository.existsUserById(userId),
        ]);
        if (!exists) {
            throw new UserNotFoundException();
        }

        if (item !== null) {
            return { ...item, computedAt };
        }

        return {
            userId,
            score: 0,
            band: EnumAnalyticFraudBand.monitor,
            contributingSignalCodes: [],
            computedAt,
        };
    }

    async riskScores(
        minScore: number | null,
        params: IPaginationQueryOffsetParams
    ): Promise<IResponsePaginationReturn<IAnalyticFraudRiskScore>> {
        return this.analyticSnapshotService.getListOffset(
            EnumAnalyticSnapshotSignal.riskScore,
            params,
            minScore === null ? null : { value: { gte: minScore } },
            AnalyticRiskScoreSnapshotDataSchema
        );
    }
}
