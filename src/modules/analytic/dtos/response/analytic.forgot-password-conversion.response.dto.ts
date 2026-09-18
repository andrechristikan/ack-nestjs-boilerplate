import { z } from 'zod';
import { faker } from '@faker-js/faker';

/**
 * Shapes how many forgot-password tokens were issued and then used.
 * @public
 */
export const AnalyticForgotPasswordConversionResponseSchema = z.object({
    created: z.number().meta({
        description: 'Forgot-password tokens issued inside the window',
        example: faker.number.int({ min: 0, max: 500 }),
    }),
    used: z.number().meta({
        description: 'Forgot-password tokens used inside the window',
        example: faker.number.int({ min: 0, max: 500 }),
    }),
    rate: z.number().meta({
        description: 'Used divided by created, between 0 and 1',
        example: faker.number.float({ min: 0, max: 1, fractionDigits: 2 }),
    }),
});

/**
 * How many forgot-password tokens were issued and then used.
 * @public
 */
export type AnalyticForgotPasswordConversionResponseDto = z.infer<
    typeof AnalyticForgotPasswordConversionResponseSchema
>;
