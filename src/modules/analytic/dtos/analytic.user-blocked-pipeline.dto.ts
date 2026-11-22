import { z } from 'zod';

/** @public */
export const AnalyticUserBlockedPipelineSchema = z.array(
    z.object({
        trend: z.number().nullable(),
        current: z.number().nullable(),
    })
);

/** @public */
export type AnalyticUserBlockedPipelineDto = z.infer<
    typeof AnalyticUserBlockedPipelineSchema
>;
