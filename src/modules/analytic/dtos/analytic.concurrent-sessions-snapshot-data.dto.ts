import { z } from 'zod';
import type { IAnalyticCountBucket } from '@modules/analytic/interfaces/analytic.interface';

/** @public */
export const AnalyticConcurrentSessionsSnapshotDataSchema = z.object({
    key: z.string(),
    count: z.number(),
}) satisfies z.ZodType<IAnalyticCountBucket>;

/** @public */
export type AnalyticConcurrentSessionsSnapshotDataDto = z.infer<
    typeof AnalyticConcurrentSessionsSnapshotDataSchema
>;
