import { z } from 'zod';
import { AnalyticPipelineObjectIdSchema } from '@modules/analytic/dtos/analytic.pipeline-object-id.dto';

/** @public */
export const AnalyticWorkspaceMembershipPipelineSchema = z.array(
    z.object({
        _id: AnalyticPipelineObjectIdSchema,
        count: z.number(),
    })
);

/** @public */
export type AnalyticWorkspaceMembershipPipelineDto = z.infer<
    typeof AnalyticWorkspaceMembershipPipelineSchema
>;
