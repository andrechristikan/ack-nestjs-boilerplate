import { z } from 'zod';
import type { IAnalyticCountBucket } from '@modules/analytic/interfaces/analytic.interface';

/** @public */
export const AnalyticCountBucketCacheSchema = z.object({
    key: z.string(),
    count: z.number(),
}) satisfies z.ZodType<IAnalyticCountBucket>;

/** @public */
export type AnalyticCountBucketCacheDto = z.infer<
    typeof AnalyticCountBucketCacheSchema
>;
