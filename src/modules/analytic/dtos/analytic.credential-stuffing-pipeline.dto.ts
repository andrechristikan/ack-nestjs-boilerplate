import { z } from 'zod';
import { AnalyticFraudCountPipelineSchema } from '@modules/analytic/dtos/analytic.fraud-count-pipeline.dto';

/** @public */
export const AnalyticCredentialStuffingPipelineSchema = z.array(
    z.object({
        data: z.array(
            z.object({
                ipAddress: z.string(),
                uniqueUsers: z.number(),
                failCount: z.number(),
            })
        ),
        total: AnalyticFraudCountPipelineSchema,
    })
);

/** @public */
export type AnalyticCredentialStuffingPipelineDto = z.infer<
    typeof AnalyticCredentialStuffingPipelineSchema
>;
