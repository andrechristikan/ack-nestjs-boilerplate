import { z } from 'zod';
import { faker } from '@faker-js/faker';

/**
 * Shapes the member, project and activity counts of a workspace.
 * @public
 */
export const AnalyticWorkspaceSummaryResponseSchema = z.object({
    memberCount: z.number().meta({
        description: 'Members of the workspace',
        example: faker.number.int({ min: 0, max: 500 }),
    }),
    projectCount: z.number().meta({
        description: 'Projects of the workspace',
        example: faker.number.int({ min: 0, max: 500 }),
    }),
    activityCount: z.number().meta({
        description: 'Activity rows recorded for the workspace',
        example: faker.number.int({ min: 0, max: 5000 }),
    }),
});

/**
 * Member, project and activity counts of a workspace.
 * @public
 */
export type AnalyticWorkspaceSummaryResponseDto = z.infer<
    typeof AnalyticWorkspaceSummaryResponseSchema
>;
