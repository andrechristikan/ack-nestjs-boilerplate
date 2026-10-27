import { z } from 'zod';
import { faker } from '@faker-js/faker';
import { AnalyticWorkspaceCountResponseSchema } from '@modules/analytic/dtos/response/analytic.workspace-count.response.dto';

/**
 * Shapes the projects created in a window and their split per workspace.
 * @public
 */
export const AnalyticProjectCreationResponseSchema = z.object({
    created: z.number().meta({
        description: 'Projects created inside the window',
        example: faker.number.int({ min: 0, max: 500 }),
    }),
    perWorkspace: z.array(AnalyticWorkspaceCountResponseSchema).meta({
        description: 'Projects created inside the window, split per workspace',
        example: [{ workspaceId: faker.string.uuid(), count: 3 }],
    }),
});

/**
 * Projects created in a window and their split per workspace.
 * @public
 */
export type AnalyticProjectCreationResponseDto = z.infer<
    typeof AnalyticProjectCreationResponseSchema
>;
