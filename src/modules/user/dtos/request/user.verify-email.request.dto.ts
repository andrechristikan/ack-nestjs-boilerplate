import { z } from 'zod';
import { faker } from '@faker-js/faker';

/** @public */
export const UserVerifyEmailRequestSchema = z.strictObject({
    token: z
        .string()
        .min(1)
        .meta({
            description: 'Verification token',
            example: faker.string.alphanumeric(20),
        }),
});

/** @public */
export type UserVerifyEmailRequestDto = z.infer<
    typeof UserVerifyEmailRequestSchema
>;
