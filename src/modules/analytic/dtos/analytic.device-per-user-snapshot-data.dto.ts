import { z } from 'zod';
import type { IAnalyticCountBucket } from '@modules/analytic/interfaces/analytic.interface';

/** @public */
export const AnalyticDevicePerUserSnapshotDataSchema = z.object({
    key: z.string(),
    count: z.number(),
}) satisfies z.ZodType<IAnalyticCountBucket>;

/** @public */
export type AnalyticDevicePerUserSnapshotDataDto = z.infer<
    typeof AnalyticDevicePerUserSnapshotDataSchema
>;
