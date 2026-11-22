import { z } from 'zod';
import type { IAnalyticWorkspaceCount } from '@modules/analytic/interfaces/analytic.interface';

/** @public */
export const AnalyticWorkspaceCountCacheSchema = z.object({
    workspaceId: z.string(),
    count: z.number(),
}) satisfies z.ZodType<IAnalyticWorkspaceCount>;

/** @public */
export type AnalyticWorkspaceCountCacheDto = z.infer<
    typeof AnalyticWorkspaceCountCacheSchema
>;
