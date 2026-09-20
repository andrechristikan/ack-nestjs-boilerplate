import { z } from 'zod';
import { faker } from '@faker-js/faker';

/**
 * Shapes how many stored passwords are past their expiry.
 * @public
 */
export const AnalyticPasswordExpiryResponseSchema = z.object({
    expired: z.number().meta({
        description: 'Users whose password is past its expiry',
        example: faker.number.int({ min: 0, max: 500 }),
    }),
    total: z.number().meta({
        description: 'Users holding a password',
        example: faker.number.int({ min: 0, max: 5000 }),
    }),
    compliant: z.number().meta({
        description: 'Users whose password is still inside its expiry',
        example: faker.number.int({ min: 0, max: 5000 }),
    }),
    rate: z.number().meta({
        description: 'Compliant divided by total, between 0 and 1',
        example: faker.number.float({ min: 0, max: 1, fractionDigits: 2 }),
    }),
});

/**
 * How many stored passwords are past their expiry.
 * @public
 */
export type AnalyticPasswordExpiryResponseDto = z.infer<
    typeof AnalyticPasswordExpiryResponseSchema
>;
