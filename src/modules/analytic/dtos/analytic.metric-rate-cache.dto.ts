import { z } from 'zod';
import type { IAnalyticMetricRate } from '@modules/analytic/interfaces/analytic.interface';

/** @public */
export const AnalyticMetricRateCacheSchema = z.object({
    count: z.number(),
    total: z.number(),
    rate: z.number(),
}) satisfies z.ZodType<IAnalyticMetricRate>;

/** @public */
export type AnalyticMetricRateCacheDto = z.infer<
    typeof AnalyticMetricRateCacheSchema
>;
