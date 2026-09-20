import { z } from 'zod';
import { faker } from '@faker-js/faker';

/**
 * Shapes how many users have two-factor authentication enabled.
 * @public
 */
export const AnalyticTwoFactorAdoptionResponseSchema = z.object({
    enabled: z.number().meta({
        description: 'Users with two-factor authentication enabled',
        example: faker.number.int({ min: 0, max: 500 }),
    }),
    total: z.number().meta({
        description: 'Users measured',
        example: faker.number.int({ min: 0, max: 5000 }),
    }),
    rate: z.number().meta({
        description: 'Enabled divided by total, between 0 and 1',
        example: faker.number.float({ min: 0, max: 1, fractionDigits: 2 }),
    }),
});

/**
 * How many users have two-factor authentication enabled.
 * @public
 */
export type AnalyticTwoFactorAdoptionResponseDto = z.infer<
    typeof AnalyticTwoFactorAdoptionResponseSchema
>;
