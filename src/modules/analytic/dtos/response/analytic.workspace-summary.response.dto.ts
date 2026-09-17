import { z } from 'zod';

/**
 * Shapes the member, project and activity counts of a workspace.
 * @public
 */
export const AnalyticWorkspaceSummaryResponseSchema = z.strictObject({
    memberCount: z.number(),
    projectCount: z.number(),
    activityCount: z.number(),
});

/**
 * Member, project and activity counts of a workspace.
 * @public
 */
export type AnalyticWorkspaceSummaryResponseDto = z.infer<
    typeof AnalyticWorkspaceSummaryResponseSchema
>;
