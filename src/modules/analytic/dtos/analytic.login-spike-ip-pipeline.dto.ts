import { z } from 'zod';

/** @public */
export const AnalyticLoginSpikeIpPipelineSchema = z.array(
    z.object({
        data: z.array(
            z.object({
                ipAddress: z.string(),
                uniqueUsers: z.number(),
                attempts: z.number(),
            })
        ),
        total: z.array(z.object({ n: z.number() })),
    })
);

/** @public */
export type AnalyticLoginSpikeIpPipelineDto = z.infer<
    typeof AnalyticLoginSpikeIpPipelineSchema
>;
