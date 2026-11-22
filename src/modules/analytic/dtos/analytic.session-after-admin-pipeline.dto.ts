import { z } from 'zod';
import { AnalyticFraudCountPipelineSchema } from '@modules/analytic/dtos/analytic.fraud-count-pipeline.dto';
import { AnalyticPipelineObjectIdSchema } from '@modules/analytic/dtos/analytic.pipeline-object-id.dto';

/** @public */
export const AnalyticSessionAfterAdminPipelineSchema = z.array(
    z.object({
        data: z.array(
            z.object({
                userId: AnalyticPipelineObjectIdSchema,
                revokedAt: z.coerce.date(),
                loginAt: z.coerce.date(),
            })
        ),
        total: AnalyticFraudCountPipelineSchema,
    })
);

/** @public */
export type AnalyticSessionAfterAdminPipelineDto = z.infer<
    typeof AnalyticSessionAfterAdminPipelineSchema
>;
