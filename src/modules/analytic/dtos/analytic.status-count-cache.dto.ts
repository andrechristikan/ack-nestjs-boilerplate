import { z } from 'zod';
import type { IAnalyticStatusCount } from '@modules/analytic/interfaces/analytic.interface';

/** @public */
export const AnalyticStatusCountCacheSchema = z.object({
    status: z.string(),
    count: z.number(),
}) satisfies z.ZodType<IAnalyticStatusCount>;

/** @public */
export type AnalyticStatusCountCacheDto = z.infer<
    typeof AnalyticStatusCountCacheSchema
>;
