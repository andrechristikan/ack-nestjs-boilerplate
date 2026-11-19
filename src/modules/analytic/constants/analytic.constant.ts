import { z } from 'zod';
import { EnumPaginationType } from '@common/pagination/enums/pagination.enum';
import type { IPaginationOffsetReturn } from '@common/pagination/interfaces/pagination.interface';
import { EnumActivityLogAction } from '@generated/prisma-client/client';
import {
    EnumAnalyticFraudBand,
    EnumAnalyticFraudContributingSignal,
} from '@modules/analytic/enums/analytic.enum';
import type {
    IAnalyticAnomalyDeviceProliferationSummaryMetadata,
    IAnalyticAnomalyFailedLoginSpikeSummary,
    IAnalyticAnomalyImpossibleTravelSummaryMetadata,
    IAnalyticAnomalyLoginSpikeIpSummary,
    IAnalyticAnomalySummary,
    IAnalyticApiKeyActiveExpired,
    IAnalyticApiKeyLifecycle,
    IAnalyticBlockedUsers,
    IAnalyticBucketsResult,
    IAnalyticChurnCount,
    IAnalyticCountBucket,
    IAnalyticCountRange,
    IAnalyticDeviceProliferation,
    IAnalyticForgotPasswordConversion,
    IAnalyticFraudCredentialStuffingSummary,
    IAnalyticFraudRiskScore,
    IAnalyticFraudSummary,
    IAnalyticImpossibleTravel,
    IAnalyticLockoutMetrics,
    IAnalyticLoginTimeAnomaly,
    IAnalyticMetricCount,
    IAnalyticMetricRate,
    IAnalyticMfaAdoption,
    IAnalyticMfaAttemptSnapshot,
    IAnalyticMobileChurn,
    IAnalyticProjectCount,
    IAnalyticProjectCreation,
    IAnalyticSessionDeviceRatio,
    IAnalyticSharedFingerprint,
    IAnalyticStatusCount,
    IAnalyticTermPolicyAcceptanceCount,
    IAnalyticTermPolicyAcceptanceRate,
    IAnalyticTermPolicyTimeToAccept,
    IAnalyticTermPolicyTimeToAcceptAverage,
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
export const AnalyticCredentialStuffingActions = [
    EnumActivityLogAction.userLoginFailed,
    EnumActivityLogAction.userReachMaxPasswordAttempt,
    EnumActivityLogAction.userReachMaxMfaAttempt,
];

/** @public */
export const AnalyticSnapshotNullMetaSchema = z.null();

/** @public */
export const AnalyticSharedFingerprintSnapshotDataSchema = z.object({
    fingerprint: z.string(),
    userCount: z.number(),
    userIds: z.array(z.string()),
}) satisfies z.ZodType<IAnalyticSharedFingerprint>;

/** @public */
export const AnalyticImpossibleTravelSnapshotDataSchema = z.object({
    userId: z.string(),
    fromSessionId: z.string(),
    toSessionId: z.string(),
    distanceKm: z.number(),
    deltaMs: z.number(),
}) satisfies z.ZodType<IAnalyticImpossibleTravel>;

/** @public */
export const AnalyticImpossibleTravelSnapshotMetaSchema = z.object({
    minDistanceKm: z.number(),
    maxDeltaInMs: z.number(),
}) satisfies z.ZodType<IAnalyticAnomalyImpossibleTravelSummaryMetadata>;

/** @public */
export const AnalyticDeviceProliferationSnapshotDataSchema = z.object({
    userId: z.string(),
    deviceCount: z.number(),
    zScore: z.number(),
}) satisfies z.ZodType<IAnalyticDeviceProliferation>;

/** @public */
export const AnalyticDeviceProliferationSnapshotMetaSchema = z.object({
    avg: z.number(),
    stdDev: z.number(),
    zScoreThreshold: z.number(),
}) satisfies z.ZodType<IAnalyticAnomalyDeviceProliferationSummaryMetadata>;

/** @public */
export const AnalyticLoginTimeAnomalySnapshotDataSchema = z.object({
    userId: z.string(),
    lastHour: z.number(),
    historicalFrequencyPercent: z.number(),
}) satisfies z.ZodType<IAnalyticLoginTimeAnomaly>;

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
    windowStart: z.coerce.date().nullable(),
    windowEnd: z.coerce.date().nullable(),
    computedAt: z.coerce.date().nullable(),
}) satisfies z.ZodType<IAnalyticAnomalySummary>;

/** @public */
export const AnalyticAnomalyFailedLoginSpikeSummaryCacheSchema =
    AnalyticAnomalySummaryCacheSchema.extend({
        metadata: z.object({
            nearLockoutMinAttempt: z.number(),
        }),
    }) satisfies z.ZodType<IAnalyticAnomalyFailedLoginSpikeSummary>;

/** @public */
export const AnalyticAnomalyLoginSpikeIpSummaryCacheSchema =
    AnalyticAnomalySummaryCacheSchema.extend({
        metadata: z.object({
            minUniqueAccounts: z.number(),
        }),
    }) satisfies z.ZodType<IAnalyticAnomalyLoginSpikeIpSummary>;

/** @public */
export const AnalyticFraudSummaryCacheSchema = z.object({
    count: z.number(),
    windowStart: z.coerce.date().nullable(),
    windowEnd: z.coerce.date().nullable(),
    computedAt: z.coerce.date().nullable(),
}) satisfies z.ZodType<IAnalyticFraudSummary>;

/** @public */
export const AnalyticFraudCredentialStuffingSummaryCacheSchema =
    AnalyticFraudSummaryCacheSchema.extend({
        metadata: z.object({
            minUniqueAccounts: z.number(),
        }),
    }) satisfies z.ZodType<IAnalyticFraudCredentialStuffingSummary>;

/** @public */
export const AnalyticRiskScoreSnapshotDataSchema = z.object({
    userId: z.string(),
    score: z.number(),
    band: z.enum(EnumAnalyticFraudBand),
    contributingSignalCodes: z.array(
        z.enum(EnumAnalyticFraudContributingSignal)
    ),
}) satisfies z.ZodType<IAnalyticFraudRiskScore>;

/** @public */
export const AnalyticConcurrentSessionsSnapshotDataSchema = z.object({
    key: z.string(),
    count: z.number(),
}) satisfies z.ZodType<IAnalyticCountBucket>;

/** @public */
export const AnalyticDevicesPerUserSnapshotDataSchema = z.object({
    key: z.string(),
    count: z.number(),
}) satisfies z.ZodType<IAnalyticCountBucket>;

/** @public */
export const AnalyticPipelineObjectIdSchema = z
    .object({ $oid: z.string() })
    .transform(value => value.$oid);

/** @public */
export const AnalyticUserChurnPipelineSchema = z.array(
    z.object({ total: z.number(), deleted: z.number() })
) satisfies z.ZodType<IAnalyticChurnCount[]>;

/** @public */
export const AnalyticUserBlockedPipelineSchema = z.array(
    z.object({
        trend: z.number().nullable(),
        current: z.number().nullable(),
    })
);

/** @public */
export const AnalyticAuthConcurrentSessionsPipelineSchema = z.array(
    z.object({
        _id: z.union([z.number(), z.string()]),
        count: z.number(),
    })
);

/** @public */
export const AnalyticAuthSessionsGroupPipelineSchema = z.array(
    z.object({
        _id: z.string().nullable(),
        count: z.number(),
    })
);

/** @public */
export const AnalyticAuthMfaAdoptionPipelineSchema = z.array(
    z.object({
        enabled: z.number().nullable(),
        total: z.number().nullable(),
    })
);

/** @public */
export const AnalyticDeviceSessionRatioPipelineSchema = z.array(
    z.object({
        sessions: z.number(),
        devices: z.number(),
    })
);

/** @public */
export const AnalyticDevicePerUserPipelineSchema = z.array(
    z.object({
        _id: z.union([z.number(), z.string()]),
        count: z.number(),
    })
);

/** @public */
export const AnalyticApiKeyActiveExpiredPipelineSchema = z.array(
    z.object({
        active: z.number(),
        expired: z.number(),
        inactive: z.number(),
    })
) satisfies z.ZodType<IAnalyticApiKeyActiveExpired[]>;

/** @public */
export const AnalyticTermPolicyAcceptancePipelineSchema = z.array(
    z.object({
        published: z.number(),
        acceptances: z.number(),
        users: z.number(),
    })
) satisfies z.ZodType<IAnalyticTermPolicyAcceptanceCount[]>;

/** @public */
export const AnalyticTermPolicyTimeToAcceptPipelineSchema = z.array(
    z.object({
        count: z.number(),
        averageMs: z.number().nullable(),
    })
) satisfies z.ZodType<IAnalyticTermPolicyTimeToAcceptAverage[]>;

/** @public */
export const AnalyticWorkspaceMembershipPipelineSchema = z.array(
    z.object({
        data: z.array(
            z.object({
                _id: AnalyticPipelineObjectIdSchema,
                count: z.number(),
            })
        ),
        total: z.array(z.object({ n: z.number() })),
    })
);

/** @public */
export const AnalyticWorkspaceActivityVolumePipelineSchema = z.array(
    z.object({
        data: z.array(
            z.object({
                _id: AnalyticPipelineObjectIdSchema,
                count: z.number(),
            })
        ),
        total: z.array(z.object({ n: z.number() })),
    })
);

/** @public */
export const AnalyticProjectMembershipPipelineSchema = z.array(
    z.object({
        data: z.array(
            z.object({
                _id: AnalyticPipelineObjectIdSchema,
                count: z.number(),
            })
        ),
        total: z.array(z.object({ n: z.number() })),
    })
);

/** @public */
export const AnalyticProjectCreationPipelineSchema = z.array(
    z.object({
        created: z.array(z.object({ n: z.number() })),
        perWorkspace: z.array(
            z.object({
                _id: AnalyticPipelineObjectIdSchema,
                count: z.number(),
            })
        ),
    })
);

/** @public */
export const AnalyticWorkspaceSummaryPipelineSchema = z.array(
    z.object({
        memberCount: z.number(),
        projectCount: z.number(),
        activityCount: z.number(),
    })
) satisfies z.ZodType<IAnalyticWorkspaceSummary[]>;

/** @public */
export const AnalyticImpossibleTravelPipelineSchema = z.array(
    z.object({
        userId: AnalyticPipelineObjectIdSchema,
        fromSessionId: AnalyticPipelineObjectIdSchema,
        toSessionId: AnalyticPipelineObjectIdSchema,
        distanceKm: z.number(),
        deltaMs: z.number(),
        occurredAt: z.coerce.date(),
    })
);

/** @public */
export const AnalyticDeviceProliferationPipelineSchema = z.array(
    z.object({
        stats: z.array(z.object({ avg: z.number(), stdDev: z.number() })),
        rows: z.array(
            z.object({
                _id: AnalyticPipelineObjectIdSchema,
                deviceCount: z.number(),
                zScore: z.number(),
            })
        ),
    })
);

/** @public */
export const AnalyticLoginTimeAnomalyPipelineSchema = z.array(
    z.object({
        _id: AnalyticPipelineObjectIdSchema,
        lastHour: z.number(),
        historicalFrequencyPercent: z.number(),
    })
);

/** @public */
export const AnalyticLoginSpikeIpPipelineSchema = z.array(
    z.object({
        data: z.array(
            z.object({
                ipAddress: z.string(),
                uniqueUsers: z.number(),
                attempts: z.number(),
            })
        ),
        total: z.array(z.object({ n: z.number() })),
    })
);

/** @public */
export const AnalyticLoginSpikeIpCountPipelineSchema = z.array(
    z.object({ n: z.number() })
);

/** @public */
export const AnalyticFraudCountPipelineSchema = z.array(
    z.object({ n: z.number() })
);

/** @public */
export const AnalyticCredentialStuffingPipelineSchema = z.array(
    z.object({
        data: z.array(
            z.object({
                ipAddress: z.string(),
                uniqueUsers: z.number(),
                failCount: z.number(),
            })
        ),
        total: AnalyticFraudCountPipelineSchema,
    })
);

/** @public */
export const AnalyticAccountTakeoverPipelineSchema = z.array(
    z.object({
        data: z.array(
            z.object({
                userId: AnalyticPipelineObjectIdSchema,
                passwordChangedAt: z.coerce.date(),
            })
        ),
        total: AnalyticFraudCountPipelineSchema,
    })
);

/** @public */
export const AnalyticSessionAfterAdminPipelineSchema = z.array(
    z.object({
        data: z.array(
            z.object({
                userId: AnalyticPipelineObjectIdSchema,
                revokedAt: z.coerce.date(),
                loginAt: z.coerce.date(),
            })
        ),
        total: AnalyticFraudCountPipelineSchema,
    })
);

/** @public */
export const AnalyticBackupCodeNewDevicePipelineSchema = z.array(
    z.object({
        data: z.array(
            z.object({
                userId: AnalyticPipelineObjectIdSchema,
                regeneratedAt: z.coerce.date(),
            })
        ),
        total: AnalyticFraudCountPipelineSchema,
    })
);

/** @public */
export const AnalyticSharedFingerprintPipelineSchema = z.array(
    z.object({
        fingerprint: z.string(),
        userCount: z.number(),
        userIds: z.array(AnalyticPipelineObjectIdSchema),
    })
) satisfies z.ZodType<IAnalyticSharedFingerprint[]>;

/** @public */
export const AnalyticKeyCountPipelineSchema = z.array(
    z.object({
        data: z.array(z.object({ key: z.string(), count: z.number() })),
        total: AnalyticFraudCountPipelineSchema,
    })
);

/** @public */
export const AnalyticForgotPasswordAbusePipelineSchema = z.array(
    z.object({
        data: z.array(
            z.object({
                userId: AnalyticPipelineObjectIdSchema,
                tokenCount: z.number(),
            })
        ),
        total: AnalyticFraudCountPipelineSchema,
    })
);

/** @public */
export const AnalyticUserCountPipelineSchema = z.array(
    z.object({
        data: z.array(
            z.object({
                userId: AnalyticPipelineObjectIdSchema,
                count: z.number(),
            })
        ),
        total: AnalyticFraudCountPipelineSchema,
    })
);

/** @public */
export const AnalyticRiskScorePipelineSchema = z.array(
    z.object({
        userId: AnalyticPipelineObjectIdSchema,
        score: z.number(),
        band: z.enum(EnumAnalyticFraudBand),
        signals: z.array(z.enum(EnumAnalyticFraudContributingSignal)),
    })
);
