import { z } from 'zod';
import { faker } from '@faker-js/faker';

/**
 * Shapes one user requesting an abusive number of forgot password tokens.
 * @public
 */
export const AnalyticForgotPasswordAbuseResponseSchema = z.object({
    userId: z.string().meta({
        description: 'Identifier of the user requesting the tokens',
        example: faker.string.uuid(),
    }),
    tokenCount: z.number().meta({
        description: 'Number of forgot password tokens issued in the window',
        example: faker.number.int({ min: 0, max: 100 }),
    }),
});

/**
 * One user requesting an abusive number of forgot password tokens.
 * @public
 */
export type AnalyticForgotPasswordAbuseResponseDto = z.infer<
    typeof AnalyticForgotPasswordAbuseResponseSchema
>;
