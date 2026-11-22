import { z } from 'zod';
import type { IAnalyticDeviceProliferation } from '@modules/analytic/interfaces/analytic.interface';

/** @public */
export const AnalyticDeviceProliferationSnapshotDataSchema = z.object({
    userId: z.string(),
    deviceCount: z.number(),
    zScore: z.number(),
}) satisfies z.ZodType<IAnalyticDeviceProliferation>;

/** @public */
export type AnalyticDeviceProliferationSnapshotDataDto = z.infer<
    typeof AnalyticDeviceProliferationSnapshotDataSchema
>;
