import { z } from 'zod';
import type { IAnalyticBucketsResult } from '@modules/analytic/interfaces/analytic.interface';
import { AnalyticCountBucketCacheSchema } from '@modules/analytic/dtos/analytic.count-bucket-cache.dto';

/** @public */
export const AnalyticBucketsResultCacheSchema = z.object({
    buckets: z.array(AnalyticCountBucketCacheSchema),
}) satisfies z.ZodType<IAnalyticBucketsResult>;

/** @public */
export type AnalyticBucketsResultCacheDto = z.infer<
    typeof AnalyticBucketsResultCacheSchema
>;
