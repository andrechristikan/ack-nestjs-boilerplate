import { z } from 'zod';
import type { IAnalyticAnomalyImpossibleTravelSummaryMetadata } from '@modules/analytic/interfaces/analytic.interface';

/** @public */
export const AnalyticImpossibleTravelSnapshotMetaSchema = z.object({
    minDistanceKm: z.number(),
    maxDeltaInMs: z.number(),
}) satisfies z.ZodType<IAnalyticAnomalyImpossibleTravelSummaryMetadata>;

/** @public */
export type AnalyticImpossibleTravelSnapshotMetaDto = z.infer<
    typeof AnalyticImpossibleTravelSnapshotMetaSchema
>;
