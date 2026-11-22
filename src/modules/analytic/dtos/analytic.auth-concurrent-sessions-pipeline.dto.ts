import { z } from 'zod';

/** @public */
export const AnalyticAuthConcurrentSessionsPipelineSchema = z.array(
    z.object({
        _id: z.union([z.number(), z.string()]),
        count: z.number(),
    })
);

/** @public */
export type AnalyticAuthConcurrentSessionsPipelineDto = z.infer<
    typeof AnalyticAuthConcurrentSessionsPipelineSchema
>;
