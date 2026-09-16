import { z } from 'zod';

export const AnalyticMetricCountResponseSchema = z.strictObject({
    count: z.number(),
});

export type AnalyticMetricCountResponseDto = z.infer<
    typeof AnalyticMetricCountResponseSchema
>;

export const AnalyticMetricRateResponseSchema = z.strictObject({
    count: z.number(),
    total: z.number(),
    rate: z.number(),
});

export type AnalyticMetricRateResponseDto = z.infer<
    typeof AnalyticMetricRateResponseSchema
>;

export const AnalyticCountBucketResponseSchema = z.strictObject({
    key: z.string(),
    count: z.number(),
});

export const AnalyticBucketsResponseSchema = z.strictObject({
    buckets: z.array(AnalyticCountBucketResponseSchema),
});

export type AnalyticBucketsResponseDto = z.infer<
    typeof AnalyticBucketsResponseSchema
>;

export const AnalyticSummaryResponseSchema = z.strictObject({
    count: z.number(),
    window: z.string().optional(),
    meta: z.record(z.string(), z.union([z.number(), z.string()])).optional(),
});

export type AnalyticSummaryResponseDto = z.infer<
    typeof AnalyticSummaryResponseSchema
>;

export const AnalyticFraudRiskScoreResponseSchema = z.strictObject({
    userId: z.string(),
    score: z.number(),
    band: z.string(),
    contributingSignalCodes: z.array(z.string()),
});

export type AnalyticFraudRiskScoreResponseDto = z.infer<
    typeof AnalyticFraudRiskScoreResponseSchema
>;

export const AnalyticWorkspaceSummaryResponseSchema = z.strictObject({
    memberCount: z.number(),
    projectCount: z.number(),
    activityCount: z.number(),
});

export type AnalyticWorkspaceSummaryResponseDto = z.infer<
    typeof AnalyticWorkspaceSummaryResponseSchema
>;

export const AnalyticJsonResponseSchema = z.record(z.string(), z.unknown());

export type AnalyticJsonResponseDto = z.infer<
    typeof AnalyticJsonResponseSchema
>;
