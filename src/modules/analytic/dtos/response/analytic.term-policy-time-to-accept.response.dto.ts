import { z } from 'zod';
import { faker } from '@faker-js/faker';

/**
 * Shapes how long users take to accept a published term policy.
 * @public
 */
export const AnalyticTermPolicyTimeToAcceptResponseSchema = z.object({
    count: z.number().meta({
        description: 'Acceptances measured',
        example: faker.number.int({ min: 0, max: 5000 }),
    }),
    averageMs: z.number().meta({
        description: 'Average milliseconds between publish and acceptance',
        example: faker.number.int({ min: 0, max: 86400000 }),
    }),
});

/**
 * How long users take to accept a published term policy.
 * @public
 */
export type AnalyticTermPolicyTimeToAcceptResponseDto = z.infer<
    typeof AnalyticTermPolicyTimeToAcceptResponseSchema
>;
