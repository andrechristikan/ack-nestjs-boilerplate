import { z } from 'zod';
import { faker } from '@faker-js/faker';
import { EnumRoleScope } from '@generated/prisma-client/client';
import { EnumRolePlatformKey } from '@modules/role/enums/role.platform-key.enum';

/**
 * Token pair issued to a client after a successful authentication.
 * @public
 */
export const AuthTokenResponseSchema = z.object({
    tokenType: z.string().meta({
        description: 'Token type prefix sent with the access token',
        example: 'Bearer',
    }),
    roleKey: z.string().meta({
        description: 'Key of the platform role the tokens are issued for',
        example: EnumRolePlatformKey.user,
    }),
    roleScope: z.enum(EnumRoleScope).meta({
        description: 'Scope of the role the tokens are issued for',
        example: EnumRoleScope.platform,
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

/**
 * Token pair issued after a successful authentication.
 * @public
 */
export type AuthTokenResponseDto = z.infer<typeof AuthTokenResponseSchema>;
