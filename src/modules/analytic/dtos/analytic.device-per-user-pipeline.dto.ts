import { z } from 'zod';

/** @public */
export const AnalyticDevicePerUserPipelineSchema = z.array(
    z.object({
        _id: z.union([z.number(), z.string()]),
        count: z.number(),
    })
);

/** @public */
export type AnalyticDevicePerUserPipelineDto = z.infer<
    typeof AnalyticDevicePerUserPipelineSchema
>;
