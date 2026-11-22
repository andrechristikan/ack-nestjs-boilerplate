import { z } from 'zod';

/** @public */
export const AnalyticFraudCountPipelineSchema = z.array(
    z.object({ n: z.number() })
);

/** @public */
export type AnalyticFraudCountPipelineDto = z.infer<
    typeof AnalyticFraudCountPipelineSchema
>;
