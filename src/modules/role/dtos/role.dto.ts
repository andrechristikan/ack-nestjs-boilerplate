import { z } from 'zod';
import { faker } from '@faker-js/faker';
import { DatabaseResponseSchema } from '@common/database/dtos/response/database.response.dto';
import { EnumRoleScope } from '@generated/prisma-client/client';
import { EnumRolePlatformKey } from '@modules/role/enums/role.platform-key.enum';
import { PolicySchema } from '@modules/policy/dtos/policy.dto';

/**
 * Base role shape: the stored role row with the policies it grants.
 * @public
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
    scope: z.enum(EnumRoleScope).meta({
        description: 'Scope the role applies to',
        example: EnumRoleScope.platform,
    }),
    key: z.string().meta({
        description: 'Immutable catalog key of the role',
        example: EnumRolePlatformKey.admin,
    }),
    policies: z.array(PolicySchema).meta({
        description: 'Policies granted by this role',
        default: [],
        example: [],
    }),
});

/**
 * Stored role with the policies it grants.
 * @public
 */
export type RoleDto = z.infer<typeof RoleSchema>;
