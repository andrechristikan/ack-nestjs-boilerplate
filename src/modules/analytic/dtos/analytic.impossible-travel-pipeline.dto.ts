import { z } from 'zod';
import { AnalyticPipelineObjectIdSchema } from '@modules/analytic/dtos/analytic.pipeline-object-id.dto';

/** @public */
export const AnalyticImpossibleTravelPipelineSchema = z.array(
    z.object({
        userId: AnalyticPipelineObjectIdSchema,
        fromSessionId: AnalyticPipelineObjectIdSchema,
        toSessionId: AnalyticPipelineObjectIdSchema,
        distanceKm: z.number(),
        deltaMs: z.number(),
        occurredAt: z.coerce.date(),
    })
);

/** @public */
export type AnalyticImpossibleTravelPipelineDto = z.infer<
    typeof AnalyticImpossibleTravelPipelineSchema
>;
