import { z } from 'zod';
import { faker } from '@faker-js/faker';

/** @public */
export const AuthSocialNonceResponseSchema = z.object({
    nonce: z.string().meta({
        description:
            'One-time value the client passes to the social provider when it starts a sign-in',
        example: faker.string.alphanumeric(32),
    }),
    expiredAt: z.date().meta({
        description: 'Date the nonce stops being accepted',
        example: faker.date.soon(),
    }),
});

/** @public */
export type AuthSocialNonceResponseDto = z.infer<
    typeof AuthSocialNonceResponseSchema
>;
