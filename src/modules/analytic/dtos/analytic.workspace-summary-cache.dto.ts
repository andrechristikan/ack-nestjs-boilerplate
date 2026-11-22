import { z } from 'zod';
import type { IAnalyticWorkspaceSummary } from '@modules/analytic/interfaces/analytic.interface';

/** @public */
export const AnalyticWorkspaceSummaryCacheSchema = z.object({
    memberCount: z.number(),
    projectCount: z.number(),
    activityCount: z.number(),
}) satisfies z.ZodType<IAnalyticWorkspaceSummary>;

/** @public */
export type AnalyticWorkspaceSummaryCacheDto = z.infer<
    typeof AnalyticWorkspaceSummaryCacheSchema
>;
