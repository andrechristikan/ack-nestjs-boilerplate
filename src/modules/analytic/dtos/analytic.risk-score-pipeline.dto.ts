import { z } from 'zod';
import {
    EnumAnalyticFraudBand,
    EnumAnalyticFraudContributingSignal,
} from '@modules/analytic/enums/analytic.enum';
import { AnalyticPipelineObjectIdSchema } from '@modules/analytic/validations/analytic.pipeline-object-id.validation';

/** @public */
export const AnalyticRiskScorePipelineSchema = z.array(
    z.object({
        userId: AnalyticPipelineObjectIdSchema,
        score: z.number(),
        band: z.enum(EnumAnalyticFraudBand),
        signals: z.array(z.enum(EnumAnalyticFraudContributingSignal)),
    })
);

/** @public */
export type AnalyticRiskScorePipelineDto = z.infer<
    typeof AnalyticRiskScorePipelineSchema
>;
