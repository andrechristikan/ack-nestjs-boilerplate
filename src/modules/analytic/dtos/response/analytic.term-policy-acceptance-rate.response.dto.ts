import { z } from 'zod';
import { faker } from '@faker-js/faker';

/**
 * Shapes how many users have accepted the published term policies.
 * @public
 */
export const AnalyticTermPolicyAcceptanceRateResponseSchema = z.object({
    acceptances: z.number().meta({
        description: 'Acceptance rows recorded',
        example: faker.number.int({ min: 0, max: 5000 }),
    }),
    users: z.number().meta({
        description: 'Users expected to accept',
        example: faker.number.int({ min: 0, max: 5000 }),
    }),
    published: z.number().meta({
        description: 'Published term policies in force',
        example: faker.number.int({ min: 0, max: 20 }),
    }),
    rate: z.number().meta({
        description: 'Acceptances divided by the expected total',
        example: faker.number.float({ min: 0, max: 1, fractionDigits: 2 }),
    }),
});

/**
 * How many users have accepted the published term policies.
 * @public
 */
export type AnalyticTermPolicyAcceptanceRateResponseDto = z.infer<
    typeof AnalyticTermPolicyAcceptanceRateResponseSchema
>;
