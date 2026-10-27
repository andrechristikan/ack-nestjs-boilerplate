import { z } from 'zod';
import { faker } from '@faker-js/faker';

/**
 * Validates the body for updating a role's display name and description.
 * @public
 */
export const RoleUpdateRequestSchema = z.strictObject({
    name: z.string().trim().min(3).max(50).meta({
        description: 'Display name of role',
        example: faker.person.jobTitle(),
    }),
    description: z.string().max(500).optional().meta({
        description: 'Description of role',
        example: faker.lorem.sentence(),
    }),
});

/**
 * Body for updating a role's display name and description.
 * @public
 */
export type RoleUpdateRequestDto = z.infer<typeof RoleUpdateRequestSchema>;
