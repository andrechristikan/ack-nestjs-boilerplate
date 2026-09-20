import { z } from 'zod';
import { faker } from '@faker-js/faker';

/**
 * Shapes the standing two-factor attempt counters.
 * @public
 */
export const AnalyticTwoFactorAttemptResponseSchema = z.object({
    usersWithAttempts: z.number().meta({
        description: 'Users holding at least one recorded attempt',
        example: faker.number.int({ min: 0, max: 500 }),
    }),
    totalAttempts: z.number().meta({
        description: 'Recorded attempts across those users',
        example: faker.number.int({ min: 0, max: 5000 }),
    }),
});

/**
 * Standing two-factor attempt counters.
 * @public
 */
export type AnalyticTwoFactorAttemptResponseDto = z.infer<
    typeof AnalyticTwoFactorAttemptResponseSchema
>;
