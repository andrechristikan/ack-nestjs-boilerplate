import { z } from 'zod';
import type { IAnalyticAnomalyDeviceProliferationSummaryMetadata } from '@modules/analytic/interfaces/analytic.interface';

/** @public */
export const AnalyticDeviceProliferationSnapshotMetaSchema = z.object({
    avg: z.number(),
    stdDev: z.number(),
    zScoreThreshold: z.number(),
}) satisfies z.ZodType<IAnalyticAnomalyDeviceProliferationSummaryMetadata>;

/** @public */
export type AnalyticDeviceProliferationSnapshotMetaDto = z.infer<
    typeof AnalyticDeviceProliferationSnapshotMetaSchema
>;
