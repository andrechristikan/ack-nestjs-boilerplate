import { z } from 'zod';
import { AnalyticPipelineObjectIdSchema } from '@modules/analytic/validations/analytic.pipeline-object-id.validation';

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
