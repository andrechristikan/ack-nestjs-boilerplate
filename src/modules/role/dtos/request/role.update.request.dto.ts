import { z } from 'zod';
import { faker } from '@faker-js/faker';

/** @public */
export const RoleUpdateRequestSchema = z.strictObject({
    name: z.string().trim().min(3).max(50).meta({
        description: 'Name of role',
        example: faker.person.jobTitle(),
    }),
    description: z.string().max(500).nullable().meta({
        description: 'Description of role; null clears it',
        example: faker.lorem.sentence(),
    }),
});

/** @public */
export type RoleUpdateRequestDto = z.infer<typeof RoleUpdateRequestSchema>;
