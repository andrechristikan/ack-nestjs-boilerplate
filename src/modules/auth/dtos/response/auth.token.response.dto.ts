import { z } from 'zod';
import { faker } from '@faker-js/faker';

/** @public */
export const AuthTokenResponseSchema = z.object({
    tokenType: z.string().meta({
        description: 'Token type prefix sent with the access token',
        example: 'Bearer',
    }),
    roleKey: z.string().meta({
        description: 'Key of the platform role the user holds',
        example: 'user',
    }),
    expiresIn: z.number().meta({
        description: 'timestamp in minutes',
        example: 3600,
    }),
    accessToken: z.string().meta({
        description: 'JWT access token',
        example: faker.string.alphanumeric(64),
    }),
    refreshToken: z.string().meta({
        description: 'JWT refresh token',
        example: faker.string.alphanumeric(64),
    }),
});

/** @public */
export type AuthTokenResponseDto = z.infer<typeof AuthTokenResponseSchema>;
