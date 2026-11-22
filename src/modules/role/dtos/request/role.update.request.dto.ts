import { z } from 'zod';
import { faker } from '@faker-js/faker';
import { EnumRoleType } from '@generated/prisma-client/client';

/** @public */
export const RoleUpdateRequestSchema = z.strictObject({
    description: z.string().max(500).nullable().meta({
        description: 'Description of role; null clears it',
        example: faker.lorem.sentence(),
    }),
    type: z.enum([EnumRoleType.admin, EnumRoleType.user]).meta({
        description: 'Representative for role type',
        example: EnumRoleType.admin,
    }),
});

/** @public */
export type RoleUpdateRequestDto = z.infer<typeof RoleUpdateRequestSchema>;
