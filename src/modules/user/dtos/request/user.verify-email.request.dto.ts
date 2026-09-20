import { z } from 'zod';
import { faker } from '@faker-js/faker';

/**
 * Validates the body for verifying an email with a token.
 * @public
 */
export const UserVerifyEmailRequestSchema = z.strictObject({
    token: z
        .string()
        .min(1)
        .meta({
            description: 'Verification token',
            example: faker.string.alphanumeric(20),
        }),
});

/**
 * Body for verifying an email with a token.
 * @public
 */
export type UserVerifyEmailRequestDto = z.infer<
    typeof UserVerifyEmailRequestSchema
>;
