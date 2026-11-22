import { z } from 'zod';
import type { IAnalyticMetricCount } from '@modules/analytic/interfaces/analytic.interface';

/** @public */
export const AnalyticMetricCountCacheSchema = z.object({
    count: z.number(),
}) satisfies z.ZodType<IAnalyticMetricCount>;

/** @public */
export type AnalyticMetricCountCacheDto = z.infer<
    typeof AnalyticMetricCountCacheSchema
>;
