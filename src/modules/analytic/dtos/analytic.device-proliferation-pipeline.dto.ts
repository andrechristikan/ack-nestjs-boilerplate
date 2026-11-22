import { z } from 'zod';
import { AnalyticPipelineObjectIdSchema } from '@modules/analytic/validations/analytic.pipeline-object-id.validation';

/** @public */
export const AnalyticDeviceProliferationPipelineSchema = z.array(
    z.object({
        stats: z.array(z.object({ avg: z.number(), stdDev: z.number() })),
        rows: z.array(
            z.object({
                _id: AnalyticPipelineObjectIdSchema,
                deviceCount: z.number(),
                zScore: z.number(),
            })
        ),
    })
);

/** @public */
export type AnalyticDeviceProliferationPipelineDto = z.infer<
    typeof AnalyticDeviceProliferationPipelineSchema
>;
