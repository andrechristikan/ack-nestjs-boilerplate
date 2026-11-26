import { RoleNameRegex } from '@modules/role/constants/role.constant';
import { z } from 'zod';
import { faker } from '@faker-js/faker';
import { RoleUpdateRequestSchema } from '@modules/role/dtos/request/role.update.request.dto';

/** @public */
export const RoleCreateRequestSchema = RoleUpdateRequestSchema.extend({
    description: z.string().trim().toLowerCase().max(500).optional().meta({
        description: 'Description of role',
        example: faker.lorem.sentence().toLowerCase(),
    }),
    name: z
        .string()
        .trim()
        .toLowerCase()
        .min(3)
        .max(30)
        .regex(RoleNameRegex)
        .meta({
            description: 'Name of role',
            example: faker.person.jobTitle(),
        })
        .transform(value => value as Lowercase<string>),
});

/** @public */
export type RoleCreateRequestDto = z.infer<typeof RoleCreateRequestSchema>;
