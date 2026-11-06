import { z } from 'zod';
import { faker } from '@faker-js/faker';

/** @public */
export const AnalyticBlockedUsersResponseSchema = z.object({
    trend: z.number().meta({
        description: 'Users blocked inside the requested window',
        example: faker.number.int({ min: 0, max: 200 }),
    }),
    current: z.number().meta({
        description: 'Users blocked at the time of the request',
        example: faker.number.int({ min: 0, max: 200 }),
    }),
});

/** @public */
export type AnalyticBlockedUsersResponseDto = z.infer<
    typeof AnalyticBlockedUsersResponseSchema
>;
