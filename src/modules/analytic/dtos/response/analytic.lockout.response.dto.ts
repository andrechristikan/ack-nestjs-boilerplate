import { z } from 'zod';
import { faker } from '@faker-js/faker';

/**
 * Shapes the failed login volume of a window against the lockout threshold.
 * @public
 */
export const AnalyticLockoutResponseSchema = z.object({
    failed: z.number().meta({
        description: 'Failed login attempts inside the window',
        example: faker.number.int({ min: 0, max: 5000 }),
    }),
    maxAttempt: z.number().meta({
        description: 'Configured attempts before an account is locked out',
        example: 5,
    }),
});

/**
 * Failed login volume of a window against the lockout threshold.
 * @public
 */
export type AnalyticLockoutResponseDto = z.infer<
    typeof AnalyticLockoutResponseSchema
>;
