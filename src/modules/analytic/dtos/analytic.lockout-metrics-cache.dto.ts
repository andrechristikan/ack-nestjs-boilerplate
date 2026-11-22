import { z } from 'zod';
import type { IAnalyticLockoutMetrics } from '@modules/analytic/interfaces/analytic.interface';

/** @public */
export const AnalyticLockoutMetricsCacheSchema = z.object({
    failed: z.number(),
    maxAttempt: z.number(),
}) satisfies z.ZodType<IAnalyticLockoutMetrics>;

/** @public */
export type AnalyticLockoutMetricsCacheDto = z.infer<
    typeof AnalyticLockoutMetricsCacheSchema
>;
