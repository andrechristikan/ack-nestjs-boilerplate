import { z } from 'zod';
import type { IAnalyticProjectCreation } from '@modules/analytic/interfaces/analytic.interface';
import { AnalyticWorkspaceCountCacheSchema } from '@modules/analytic/dtos/analytic.workspace-count-cache.dto';

/** @public */
export const AnalyticProjectCreationCacheSchema = z.object({
    created: z.number(),
    perWorkspace: z.array(AnalyticWorkspaceCountCacheSchema),
}) satisfies z.ZodType<IAnalyticProjectCreation>;

/** @public */
export type AnalyticProjectCreationCacheDto = z.infer<
    typeof AnalyticProjectCreationCacheSchema
>;
