import { z } from 'zod';
import { faker } from '@faker-js/faker';
import { DatabaseResponseSchema } from '@common/database/dtos/response/database.response.dto';
import { EnumRoleScope } from '@generated/prisma-client/client';
import { PolicySchema } from '@modules/policy/dtos/policy.dto';

/** @public */
export const RoleSchema = DatabaseResponseSchema.omit({
    deletedAt: true,
    deletedBy: true,
}).extend({
    scope: z.enum(EnumRoleScope).meta({
        description: 'Scope the role applies to',
        example: EnumRoleScope.platform,
    }),
    key: z.string().meta({
        description: 'Immutable key, unique within the scope',
        example: 'admin',
    }),
    name: z.string().meta({
        description: 'Name of role',
        example: faker.person.jobTitle(),
    }),
    description: z.string().max(500).nullable().meta({
        description: 'Description of role',
        example: faker.lorem.sentence(),
    }),
    policyRevision: z.number().int().meta({
        description: 'Revision that increments on every policy write',
        example: 0,
    }),
    policies: z.array(PolicySchema).meta({
        description: 'Policies granted by this role',
        default: [],
        example: [],
    }),
});

/** @public */
export type RoleDto = z.infer<typeof RoleSchema>;
