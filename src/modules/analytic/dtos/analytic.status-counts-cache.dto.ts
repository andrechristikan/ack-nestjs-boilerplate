import { z } from 'zod';
import type { IAnalyticStatusCount } from '@modules/analytic/interfaces/analytic.interface';
import { AnalyticStatusCountCacheSchema } from '@modules/analytic/dtos/analytic.status-count-cache.dto';

/** @public */
export const AnalyticStatusCountsCacheSchema = z.array(
    AnalyticStatusCountCacheSchema
) satisfies z.ZodType<IAnalyticStatusCount[]>;

/** @public */
export type AnalyticStatusCountsCacheDto = z.infer<
    typeof AnalyticStatusCountsCacheSchema
>;
