import { z } from 'zod';
import { faker } from '@faker-js/faker';
import { RoleUpdateRequestSchema } from '@modules/role/dtos/request/role.update.request.dto';

/**
 * Validates the body for creating a role.
 * @public
 */
export const RoleCreateRequestSchema = RoleUpdateRequestSchema.extend({
    description: z.string().max(500).optional().meta({
        description: 'Description of role',
        example: faker.lorem.sentence(),
    }),
    name: z
        .string()
        .trim()
        .toLowerCase()
        .min(3)
        .max(30)
        .regex(/^[a-zA-Z0-9]+$/)
        .meta({
            description: 'Name of role',
            example: faker.person.jobTitle(),
        })
        .transform(value => value as Lowercase<string>),
});

/**
 * Body for creating a role.
 * @public
 */
export type RoleCreateRequestDto = z.infer<typeof RoleCreateRequestSchema>;
