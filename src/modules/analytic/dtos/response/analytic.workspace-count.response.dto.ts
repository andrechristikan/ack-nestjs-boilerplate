import { z } from 'zod';
import { faker } from '@faker-js/faker';

/** @public */
export const AnalyticWorkspaceCountResponseSchema = z.object({
    workspaceId: z.string().meta({
        description: 'Identifier of the counted workspace',
        example: faker.database.mongodbObjectId(),
    }),
    count: z.number().meta({
        description: 'Number of rows belonging to the workspace',
        example: faker.number.int({ min: 0, max: 5000 }),
    }),
});

/** @public */
export type AnalyticWorkspaceCountResponseDto = z.infer<
    typeof AnalyticWorkspaceCountResponseSchema
>;
