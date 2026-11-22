import { z } from 'zod';

/** @public */
export const AnalyticLoginSpikeIpCountPipelineSchema = z.array(
    z.object({ n: z.number() })
);

/** @public */
export type AnalyticLoginSpikeIpCountPipelineDto = z.infer<
    typeof AnalyticLoginSpikeIpCountPipelineSchema
>;
