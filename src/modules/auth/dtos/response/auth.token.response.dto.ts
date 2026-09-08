import { z } from 'zod';
import { faker } from '@faker-js/faker';
import { EnumRoleType } from '@generated/prisma-client';

/**
 * Token pair issued to a client after a successful authentication.
 */
export const AuthTokenResponseSchema = z.object({
    tokenType: z.string().meta({
        description: 'Token type prefix sent with the access token',
        example: 'Bearer',
    }),
    roleType: z.enum(EnumRoleType).meta({
        description: 'Role type encoded in the issued tokens',
        example: EnumRoleType.user,
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

export type AuthTokenResponseDto = z.infer<typeof AuthTokenResponseSchema>;
