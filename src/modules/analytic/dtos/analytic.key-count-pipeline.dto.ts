import { z } from 'zod';
import { AnalyticFraudCountPipelineSchema } from '@modules/analytic/dtos/analytic.fraud-count-pipeline.dto';

/** @public */
export const AnalyticKeyCountPipelineSchema = z.array(
    z.object({
        data: z.array(z.object({ key: z.string(), count: z.number() })),
        total: AnalyticFraudCountPipelineSchema,
    })
);

/** @public */
export type AnalyticKeyCountPipelineDto = z.infer<
    typeof AnalyticKeyCountPipelineSchema
>;
