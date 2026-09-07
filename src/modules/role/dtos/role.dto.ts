import { z } from 'zod';
import { faker } from '@faker-js/faker';
import { DatabaseResponseSchema } from '@common/database/dtos/response/database.response.dto';
import { EnumRoleType } from '@generated/prisma-client';
import { PolicySchema } from '@modules/policy/dtos/policy.dto';

/**
 * Base role shape: the stored role row with the policies it grants.
 */
export const RoleSchema = DatabaseResponseSchema.omit({
    deletedAt: true,
    deletedBy: true,
}).extend({
    name: z.string().meta({
        description: 'Name of role',
        example: faker.person.jobTitle(),
    }),
    description: z.string().max(500).nullable().meta({
        description: 'Description of role',
        example: faker.lorem.sentence(),
    }),
    type: z.enum(EnumRoleType).meta({
        description: 'Representative for role type',
        example: EnumRoleType.admin,
    }),
    policies: z.array(PolicySchema).meta({
        description: 'Policies granted by this role',
        default: [],
        example: [],
    }),
});

export type RoleDto = z.infer<typeof RoleSchema>;
