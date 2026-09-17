import { z } from 'zod';

/**
 * Shapes a counted analytics metric with its window and extra figures.
 * @public
 */
export const AnalyticSummaryResponseSchema = z.strictObject({
    count: z.number(),
    window: z.string().optional(),
    meta: z.record(z.string(), z.union([z.number(), z.string()])).optional(),
});

/**
 * Counted analytics metric.
 * @public
 */
export type AnalyticSummaryResponseDto = z.infer<
    typeof AnalyticSummaryResponseSchema
>;
