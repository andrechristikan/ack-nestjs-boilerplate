import { z } from 'zod';
import { AnalyticPipelineObjectIdSchema } from '@modules/analytic/dtos/analytic.pipeline-object-id.dto';

/** @public */
export const AnalyticWorkspaceActivityVolumePipelineSchema = z.array(
    z.object({
        data: z.array(
            z.object({
                _id: AnalyticPipelineObjectIdSchema,
                count: z.number(),
            })
        ),
        total: z.array(z.object({ n: z.number() })),
    })
);

/** @public */
export type AnalyticWorkspaceActivityVolumePipelineDto = z.infer<
    typeof AnalyticWorkspaceActivityVolumePipelineSchema
>;
