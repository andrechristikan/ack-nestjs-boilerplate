import { z } from 'zod';
import { AnalyticPipelineObjectIdSchema } from '@modules/analytic/validations/analytic.pipeline-object-id.validation';

/** @public */
export const AnalyticProjectCreationPipelineSchema = z.array(
    z.object({
        created: z.array(z.object({ n: z.number() })),
        perWorkspace: z.array(
            z.object({
                _id: AnalyticPipelineObjectIdSchema,
                count: z.number(),
            })
        ),
    })
);

/** @public */
export type AnalyticProjectCreationPipelineDto = z.infer<
    typeof AnalyticProjectCreationPipelineSchema
>;
