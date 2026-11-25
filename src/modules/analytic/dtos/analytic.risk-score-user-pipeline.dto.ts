import { z } from 'zod';
import { AnalyticRiskScoreSnapshotDataSchema } from '@modules/analytic/dtos/analytic.risk-score-snapshot-data.dto';

/** @public */
export const AnalyticRiskScoreUserPipelineSchema = z.array(
    z.object({
        computedAt: z.coerce.date().nullable(),
        data: AnalyticRiskScoreSnapshotDataSchema.nullable(),
    })
);

/** @public */
export type AnalyticRiskScoreUserPipelineDto = z.infer<
    typeof AnalyticRiskScoreUserPipelineSchema
>;
