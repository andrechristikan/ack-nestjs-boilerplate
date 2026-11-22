import { z } from 'zod';
import type { IAnalyticImpossibleTravel } from '@modules/analytic/interfaces/analytic.interface';

/** @public */
export const AnalyticImpossibleTravelSnapshotDataSchema = z.object({
    userId: z.string(),
    fromSessionId: z.string(),
    toSessionId: z.string(),
    distanceKm: z.number(),
    deltaMs: z.number(),
}) satisfies z.ZodType<IAnalyticImpossibleTravel>;

/** @public */
export type AnalyticImpossibleTravelSnapshotDataDto = z.infer<
    typeof AnalyticImpossibleTravelSnapshotDataSchema
>;
