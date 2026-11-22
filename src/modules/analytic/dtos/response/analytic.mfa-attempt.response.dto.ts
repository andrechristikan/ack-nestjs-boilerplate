import { z } from 'zod';
import { faker } from '@faker-js/faker';

/** @public */
export const AnalyticMfaAttemptResponseSchema = z.object({
    usersWithAttempts: z.number().meta({
        description: 'Users holding at least one recorded attempt',
        example: faker.number.int({ min: 0, max: 500 }),
    }),
    totalAttempts: z.number().meta({
        description: 'Recorded attempts across those users',
        example: faker.number.int({ min: 0, max: 5000 }),
    }),
});

/** @public */
export type AnalyticMfaAttemptResponseDto = z.infer<
    typeof AnalyticMfaAttemptResponseSchema
>;
