import { z } from 'zod';
import type { IAnalyticBucketsSnapshotMeta } from '@modules/analytic/interfaces/analytic.interface';
import { AnalyticCountBucketCacheSchema } from '@modules/analytic/dtos/analytic.count-bucket-cache.dto';

/** @public */
export const AnalyticBucketsSnapshotMetaSchema = z.object({
    buckets: z.array(AnalyticCountBucketCacheSchema),
}) satisfies z.ZodType<IAnalyticBucketsSnapshotMeta>;

/** @public */
export type AnalyticBucketsSnapshotMetaDto = z.infer<
    typeof AnalyticBucketsSnapshotMetaSchema
>;
