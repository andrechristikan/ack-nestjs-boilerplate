import { z } from 'zod';
import type { IAnalyticWorkspaceSummary } from '@modules/analytic/interfaces/analytic.interface';

/** @public */
export const AnalyticWorkspaceSummaryPipelineSchema = z.array(
    z.object({
        memberCount: z.number(),
        projectCount: z.number(),
        activityCount: z.number(),
    })
) satisfies z.ZodType<IAnalyticWorkspaceSummary[]>;

/** @public */
export type AnalyticWorkspaceSummaryPipelineDto = z.infer<
    typeof AnalyticWorkspaceSummaryPipelineSchema
>;
