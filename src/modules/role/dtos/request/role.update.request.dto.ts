import { z } from 'zod';
import { faker } from '@faker-js/faker';
import { EnumRoleType } from '@generated/prisma-client/client';

/**
 * Validates the body for updating a role description and type.
 * @public
 */
export const RoleUpdateRequestSchema = z.strictObject({
    description: z.string().max(500).optional().meta({
        description: 'Description of role',
        example: faker.lorem.sentence(),
    }),
    type: z.enum(EnumRoleType).meta({
        description: 'Representative for role type',
        example: EnumRoleType.admin,
    }),
});

/**
 * Body for updating a role description and type.
 * @public
 */
export type RoleUpdateRequestDto = z.infer<typeof RoleUpdateRequestSchema>;
