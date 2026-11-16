import { z } from 'zod';
import { faker } from '@faker-js/faker';

/** @public */
export const UserVerifyEmailRequestSchema = z.strictObject({
    token: z
        .string()
        .min(1)
        .max(200)
        .meta({
            description: 'Verification token, at most 200 characters',
            example: faker.string.alphanumeric(20),
        }),
});

/** @public */
export type UserVerifyEmailRequestDto = z.infer<
    typeof UserVerifyEmailRequestSchema
>;
