import { z } from 'zod';
import { faker } from '@faker-js/faker';

/** @public */
export const AnalyticUserCountResponseSchema = z.object({
    userId: z.string().meta({
        description: 'Identifier of the counted user',
        example: faker.database.mongodbObjectId(),
    }),
    count: z.number().meta({
        description: 'Number of rows recorded for the user in the window',
        example: faker.number.int({ min: 0, max: 5000 }),
    }),
});

/** @public */
export type AnalyticUserCountResponseDto = z.infer<
    typeof AnalyticUserCountResponseSchema
>;
