import { z } from 'zod';

/** @public */
export const AnalyticAuthSessionsGroupPipelineSchema = z.array(
    z.object({
        _id: z.string().nullable(),
        count: z.number(),
    })
);

/** @public */
export type AnalyticAuthSessionsGroupPipelineDto = z.infer<
    typeof AnalyticAuthSessionsGroupPipelineSchema
>;
