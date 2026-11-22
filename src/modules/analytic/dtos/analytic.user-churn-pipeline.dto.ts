import { z } from 'zod';
import type { IAnalyticChurnCount } from '@modules/analytic/interfaces/analytic.interface';

/** @public */
export const AnalyticUserChurnPipelineSchema = z.array(
    z.object({ total: z.number(), deleted: z.number() })
) satisfies z.ZodType<IAnalyticChurnCount[]>;

/** @public */
export type AnalyticUserChurnPipelineDto = z.infer<
    typeof AnalyticUserChurnPipelineSchema
>;
