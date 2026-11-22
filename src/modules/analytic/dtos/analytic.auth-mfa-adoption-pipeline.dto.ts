import { z } from 'zod';

/** @public */
export const AnalyticAuthMfaAdoptionPipelineSchema = z.array(
    z.object({
        enabled: z.number().nullable(),
        total: z.number().nullable(),
    })
);

/** @public */
export type AnalyticAuthMfaAdoptionPipelineDto = z.infer<
    typeof AnalyticAuthMfaAdoptionPipelineSchema
>;
