import { z } from 'zod';
import { faker } from '@faker-js/faker';

/** @public */
export const AnalyticProjectCountResponseSchema = z.object({
    projectId: z.string().meta({
        description: 'Identifier of the counted project',
        example: faker.database.mongodbObjectId(),
    }),
    count: z.number().meta({
        description: 'Number of rows belonging to the project',
        example: faker.number.int({ min: 0, max: 5000 }),
    }),
});

/** @public */
export type AnalyticProjectCountResponseDto = z.infer<
    typeof AnalyticProjectCountResponseSchema
>;
