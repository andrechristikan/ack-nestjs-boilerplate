import { z } from 'zod';
import { AnalyticFraudCountPipelineSchema } from '@modules/analytic/dtos/analytic.fraud-count-pipeline.dto';
import type { IAnalyticSnapshotListPipeline } from '@modules/analytic/interfaces/analytic.interface';

/** @public */
export const AnalyticSnapshotListPipelineSchema = z.array(
    z.object({
        computedAt: z.coerce.date(),
        page: z.array(
            z.object({
                data: z.array(z.object({ data: z.json() })),
                total: AnalyticFraudCountPipelineSchema,
            })
        ),
    })
) satisfies z.ZodType<IAnalyticSnapshotListPipeline[]>;

/** @public */
export type AnalyticSnapshotListPipelineDto = z.infer<
    typeof AnalyticSnapshotListPipelineSchema
>;
