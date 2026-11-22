import { z } from 'zod';
import { AnalyticFraudCountPipelineSchema } from '@modules/analytic/dtos/analytic.fraud-count-pipeline.dto';
import { AnalyticPipelineObjectIdSchema } from '@modules/analytic/dtos/analytic.pipeline-object-id.dto';

/** @public */
export const AnalyticForgotPasswordAbusePipelineSchema = z.array(
    z.object({
        data: z.array(
            z.object({
                userId: AnalyticPipelineObjectIdSchema,
                tokenCount: z.number(),
            })
        ),
        total: AnalyticFraudCountPipelineSchema,
    })
);

/** @public */
export type AnalyticForgotPasswordAbusePipelineDto = z.infer<
    typeof AnalyticForgotPasswordAbusePipelineSchema
>;
