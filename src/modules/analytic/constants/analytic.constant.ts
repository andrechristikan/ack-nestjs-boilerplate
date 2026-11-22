import { z } from 'zod';
import { EnumPaginationType } from '@common/pagination/enums/pagination.enum';
import type { IPaginationOffsetReturn } from '@common/pagination/interfaces/pagination.interface';
import { EnumActivityLogAction } from '@generated/prisma-client/client';
import {
    EnumAnalyticFraudBand,
    EnumAnalyticFraudContributingSignal,
} from '@modules/analytic/enums/analytic.enum';
import type {
    IAnalyticAnomalyDeviceProliferationSummary,
    IAnalyticAnomalyFailedLoginSpikeSummary,
    IAnalyticAnomalyImpossibleTravelSummary,
    IAnalyticAnomalyLoginSpikeIpSummary,
    IAnalyticAnomalySummary,
    IAnalyticApiKeyActiveExpired,
    IAnalyticApiKeyLifecycle,
    IAnalyticBlockedUsers,
    IAnalyticBucketsResult,
    IAnalyticCountBucket,
    IAnalyticCountRange,
    IAnalyticForgotPasswordConversion,
    IAnalyticFraudCredentialStuffingSummary,
    IAnalyticFraudRiskScore,
    IAnalyticFraudSummary,
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
    IAnalyticVerificationFunnel,
    IAnalyticVerificationFunnels,
    IAnalyticWorkspaceCount,
    IAnalyticWorkspaceSummary,
} from '@modules/analytic/interfaces/analytic.interface';

/** @public */
export const AnalyticMassRegistrationActions = [
    EnumActivityLogAction.userSignedUp,
    EnumActivityLogAction.userCreated,
];

/** @public */
export const AnalyticCacheEmptyToken = '_';

/** @public */
export const AnalyticCountRanges: IAnalyticCountRange[] = [
    { key: '1', min: 1, max: 1 },
    { key: '2', min: 2, max: 2 },
    { key: '3-5', min: 3, max: 5 },
    { key: '6+', min: 6, max: null },
];

/** @public */
export const AnalyticMetricCountCacheSchema = z.object({
    count: z.number(),
}) satisfies z.ZodType<IAnalyticMetricCount>;

/** @public */
export const AnalyticMetricRateCacheSchema = z.object({
    count: z.number(),
    total: z.number(),
    rate: z.number(),
}) satisfies z.ZodType<IAnalyticMetricRate>;

/** @public */
export const AnalyticBlockedUsersCacheSchema = z.object({
    trend: z.number(),
    current: z.number(),
}) satisfies z.ZodType<IAnalyticBlockedUsers>;

/** @public */
export const AnalyticCountBucketCacheSchema = z.object({
    key: z.string(),
    count: z.number(),
}) satisfies z.ZodType<IAnalyticCountBucket>;

/** @public */
export const AnalyticBucketsResultCacheSchema = z.object({
    buckets: z.array(AnalyticCountBucketCacheSchema),
}) satisfies z.ZodType<IAnalyticBucketsResult>;

/** @public */
export const AnalyticLockoutMetricsCacheSchema = z.object({
    failed: z.number(),
    maxAttempt: z.number(),
}) satisfies z.ZodType<IAnalyticLockoutMetrics>;

/** @public */
export const AnalyticForgotPasswordConversionCacheSchema = z.object({
    created: z.number(),
    used: z.number(),
    rate: z.number(),
}) satisfies z.ZodType<IAnalyticForgotPasswordConversion>;

/** @public */
export const AnalyticMfaAdoptionCacheSchema = z.object({
    enabled: z.number(),
    total: z.number(),
    rate: z.number(),
}) satisfies z.ZodType<IAnalyticMfaAdoption>;

/** @public */
export const AnalyticMfaAttemptSnapshotCacheSchema = z.object({
    usersWithAttempts: z.number(),
    totalAttempts: z.number(),
}) satisfies z.ZodType<IAnalyticMfaAttemptSnapshot>;

/** @public */
export const AnalyticVerificationFunnelCacheSchema = z.object({
    used: z.number(),
    unused: z.number(),
    total: z.number(),
    rate: z.number(),
}) satisfies z.ZodType<IAnalyticVerificationFunnel>;

/** @public */
export const AnalyticVerificationFunnelsCacheSchema = z.object({
    email: AnalyticVerificationFunnelCacheSchema,
    mobile: AnalyticVerificationFunnelCacheSchema,
}) satisfies z.ZodType<IAnalyticVerificationFunnels>;

/** @public */
export const AnalyticMobileChurnCacheSchema = z.object({
    added: z.number(),
    updated: z.number(),
    deleted: z.number(),
}) satisfies z.ZodType<IAnalyticMobileChurn>;

/** @public */
export const AnalyticSessionDeviceRatioCacheSchema = z.object({
    sessions: z.number(),
    devices: z.number(),
    ratio: z.number(),
}) satisfies z.ZodType<IAnalyticSessionDeviceRatio>;

/** @public */
export const AnalyticApiKeyLifecycleCacheSchema = z.object({
    created: z.number(),
    reset: z.number(),
    updated: z.number(),
    deleted: z.number(),
}) satisfies z.ZodType<IAnalyticApiKeyLifecycle>;

/** @public */
export const AnalyticApiKeyActiveExpiredCacheSchema = z.object({
    active: z.number(),
    expired: z.number(),
    inactive: z.number(),
}) satisfies z.ZodType<IAnalyticApiKeyActiveExpired>;

/** @public */
export const AnalyticTermPolicyAcceptanceRateCacheSchema = z.object({
    acceptances: z.number(),
    users: z.number(),
    published: z.number(),
    rate: z.number(),
}) satisfies z.ZodType<IAnalyticTermPolicyAcceptanceRate>;

/** @public */
export const AnalyticTermPolicyTimeToAcceptCacheSchema = z.object({
    count: z.number(),
    averageMs: z.number(),
}) satisfies z.ZodType<IAnalyticTermPolicyTimeToAccept>;

/** @public */
export const AnalyticWorkspaceCountCacheSchema = z.object({
    workspaceId: z.string(),
    count: z.number(),
}) satisfies z.ZodType<IAnalyticWorkspaceCount>;

/** @public */
export const AnalyticProjectCountCacheSchema = z.object({
    projectId: z.string(),
    count: z.number(),
}) satisfies z.ZodType<IAnalyticProjectCount>;

/** @public */
export const AnalyticProjectCreationCacheSchema = z.object({
    created: z.number(),
    perWorkspace: z.array(AnalyticWorkspaceCountCacheSchema),
}) satisfies z.ZodType<IAnalyticProjectCreation>;

/** @public */
export const AnalyticStatusCountCacheSchema = z.object({
    status: z.string(),
    count: z.number(),
}) satisfies z.ZodType<IAnalyticStatusCount>;

/** @public */
export const AnalyticStatusCountsCacheSchema = z.array(
    AnalyticStatusCountCacheSchema
) satisfies z.ZodType<IAnalyticStatusCount[]>;

/** @public */
export const AnalyticWorkspaceCountPageCacheSchema = z.object({
    type: z.literal(EnumPaginationType.offset),
    count: z.number(),
    perPage: z.number(),
    hasNext: z.boolean(),
    hasPrevious: z.boolean(),
    page: z.number(),
    nextPage: z.number().exactOptional(),
    previousPage: z.number().exactOptional(),
    totalPage: z.number(),
    data: z.array(AnalyticWorkspaceCountCacheSchema),
}) satisfies z.ZodType<IPaginationOffsetReturn<IAnalyticWorkspaceCount>>;

/** @public */
export const AnalyticProjectCountPageCacheSchema = z.object({
    type: z.literal(EnumPaginationType.offset),
    count: z.number(),
    perPage: z.number(),
    hasNext: z.boolean(),
    hasPrevious: z.boolean(),
    page: z.number(),
    nextPage: z.number().exactOptional(),
    previousPage: z.number().exactOptional(),
    totalPage: z.number(),
    data: z.array(AnalyticProjectCountCacheSchema),
}) satisfies z.ZodType<IPaginationOffsetReturn<IAnalyticProjectCount>>;

/** @public */
export const AnalyticWorkspaceSummaryCacheSchema = z.object({
    memberCount: z.number(),
    projectCount: z.number(),
    activityCount: z.number(),
}) satisfies z.ZodType<IAnalyticWorkspaceSummary>;

/** @public */
export const AnalyticAnomalySummaryCacheSchema = z.object({
    count: z.number(),
    window: z.string().nullable(),
}) satisfies z.ZodType<IAnalyticAnomalySummary>;

/** @public */
export const AnalyticAnomalyImpossibleTravelSummaryCacheSchema =
    AnalyticAnomalySummaryCacheSchema.extend({
        meta: z.object({
            minDistanceKm: z.number(),
            maxDeltaInMs: z.number(),
        }),
    }) satisfies z.ZodType<IAnalyticAnomalyImpossibleTravelSummary>;

/** @public */
export const AnalyticAnomalyLoginSpikeIpSummaryCacheSchema =
    AnalyticAnomalySummaryCacheSchema.extend({
        meta: z.object({
            minUniqueAccounts: z.number(),
        }),
    }) satisfies z.ZodType<IAnalyticAnomalyLoginSpikeIpSummary>;

/** @public */
export const AnalyticAnomalyFailedLoginSpikeSummaryCacheSchema =
    AnalyticAnomalySummaryCacheSchema.extend({
        meta: z.object({
            nearLockoutMinAttempt: z.number(),
            bucketCount: z.number(),
        }),
    }) satisfies z.ZodType<IAnalyticAnomalyFailedLoginSpikeSummary>;

/** @public */
export const AnalyticAnomalyDeviceProliferationSummaryCacheSchema =
    AnalyticAnomalySummaryCacheSchema.extend({
        meta: z.object({
            avg: z.number(),
            stdDev: z.number(),
            zScoreThreshold: z.number(),
        }),
    }) satisfies z.ZodType<IAnalyticAnomalyDeviceProliferationSummary>;

/** @public */
export const AnalyticFraudSummaryCacheSchema = z.object({
    count: z.number(),
    window: z.string().nullable(),
}) satisfies z.ZodType<IAnalyticFraudSummary>;

/** @public */
export const AnalyticFraudCredentialStuffingSummaryCacheSchema =
    AnalyticFraudSummaryCacheSchema.extend({
        meta: z.object({
            minUniqueAccounts: z.number(),
        }),
    }) satisfies z.ZodType<IAnalyticFraudCredentialStuffingSummary>;

/** @public */
export const AnalyticFraudRiskScoreCacheSchema = z.object({
    userId: z.string(),
    score: z.number(),
    band: z.enum(EnumAnalyticFraudBand),
    contributingSignalCodes: z.array(
        z.enum(EnumAnalyticFraudContributingSignal)
    ),
}) satisfies z.ZodType<IAnalyticFraudRiskScore>;
